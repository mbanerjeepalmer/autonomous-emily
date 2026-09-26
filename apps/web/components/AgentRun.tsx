"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { briefToPrompt, type DiscoveryBrief } from "@/lib/agent/brief";
import {
  agentLabel,
  agentRunStorageKey,
  parseAgent,
  writeStoredAgent,
  type AgentId,
} from "@/lib/agent/provider";
import { AgentToggle } from "@/components/AgentToggle";
import { GateSignIn } from "@/components/GateSignIn";

type RunStatus = "pending" | "submitted" | "empty";

type RunSnapshot = {
  requestId: string;
  status: RunStatus;
  findingCount: number;
};

const inFlight = new Map<string, Promise<RunSnapshot>>();
const MAX_POLL_ATTEMPTS = 45;
const POLL_MS = 2000;

function briefKey(brief: DiscoveryBrief): string {
  return briefToPrompt(brief);
}

function readSnapshot(key: string): RunSnapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as RunSnapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, snap: RunSnapshot): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(snap));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

class AuthRequiredError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthRequiredError";
  }
}

async function invokeAgent(brief: DiscoveryBrief, agent: AgentId): Promise<RunSnapshot> {
  const res = await fetch(agent === "grok" ? "/api/emily/invoke" : "/api/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agent === "grok" ? { task: briefToPrompt(brief), context: brief } : brief),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok || data.ok === false) {
    throw new Error(typeof data.error === "string" ? data.error : `Agent failed (${res.status})`);
  }

  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (!requestId) throw new Error("Agent did not return a requestId");

  if (agent === "pi") {
    const findings = Array.isArray(data.findings) ? data.findings : [];
    const status: RunStatus = data.status === "empty" || findings.length === 0 ? "empty" : "submitted";
    return { requestId, status, findingCount: findings.length };
  }

  return { requestId, status: "pending", findingCount: 0 };
}

async function startOrResume(brief: DiscoveryBrief, agent: AgentId): Promise<RunSnapshot> {
  const key = agentRunStorageKey(briefKey(brief), agent);
  const stored = readSnapshot(key);
  if (stored?.requestId && stored.status !== "pending") return stored;
  if (stored?.requestId && stored.status === "pending") return stored;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const work = invokeAgent(brief, agent).then((snap) => {
    writeSnapshot(key, snap);
    return snap;
  });
  inFlight.set(key, work);
  try {
    return await work;
  } finally {
    inFlight.delete(key);
  }
}

async function pollRun(requestId: string): Promise<RunSnapshot | null> {
  const res = await fetch(`/api/emily/runs/${encodeURIComponent(requestId)}`);
  if (res.status === 401) throw new AuthRequiredError();
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return {
    requestId: typeof data.requestId === "string" ? data.requestId : requestId,
    status: data.status === "submitted" || data.status === "empty" ? data.status : "pending",
    findingCount: typeof data.findingCount === "number" ? data.findingCount : 0,
  };
}

export function AgentRun({
  brief,
  agent: initialAgent,
  initiallySignedIn,
  queryString,
}: {
  brief: DiscoveryBrief;
  agent: AgentId;
  initiallySignedIn: boolean;
  queryString: string;
}) {
  const router = useRouter();
  const agent = parseAgent(initialAgent);
  const key = useMemo(() => briefKey(brief), [brief]);
  const briefRef = useRef(brief);
  briefRef.current = brief;

  const [signedIn, setSignedIn] = useState(initiallySignedIn);
  const [run, setRun] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  function setAgent(next: AgentId) {
    writeStoredAgent(next);
    const params = new URLSearchParams(queryString);
    params.set("agent", next);
    const nextQs = params.toString();
    router.replace(nextQs ? `/results?${nextQs}` : "/results");
  }

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const storageKey = agentRunStorageKey(key, agent);

    const apply = (snap: RunSnapshot, { refresh }: { refresh: boolean }) => {
      if (cancelled) return;
      setRun(snap);
      writeSnapshot(storageKey, snap);
      if (refresh && snap.status !== "pending") router.refresh();
    };

    const start = async () => {
      setError(null);
      setStarting(true);
      try {
        const prior = readSnapshot(storageKey);
        if (prior?.status === "submitted" || prior?.status === "empty") {
          setRun(prior);
          return;
        }
        const snap = await startOrResume(briefRef.current, agent);
        if (cancelled) return;
        apply(snap, { refresh: snap.status !== "pending" });
        if (agent !== "grok" || snap.status !== "pending") return;

        let attempts = 0;
        const tick = async () => {
          attempts += 1;
          try {
            const next = await pollRun(snap.requestId);
            if (cancelled) return;
            if (next && next.status !== "pending") {
              apply(next, { refresh: true });
              return;
            }
            if (next) setRun(next);
          } catch (err) {
            if (err instanceof AuthRequiredError) {
              setSignedIn(false);
              return;
            }
          }
          if (!cancelled && attempts < MAX_POLL_ATTEMPTS) {
            timer = setTimeout(tick, POLL_MS);
          }
        };
        timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthRequiredError) {
          setSignedIn(false);
          return;
        }
        setError(err instanceof Error ? err.message : "Could not start the agent");
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    const stored = typeof window !== "undefined" ? readSnapshot(storageKey) : null;
    if (stored) setRun(stored);
    void start();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [agent, key, router, signedIn]);

  const name = agentLabel(agent);
  const waiting = signedIn && (starting || run?.status === "pending");

  return (
    <section className="card agent-run" style={{ marginBottom: 16 }}>
      <div className="agent-run-head">
        <div>
          <h2 style={{ margin: "0 0 4px" }}>
            {!signedIn
              ? "Sign in to send this brief to Emily"
              : waiting
                ? `${name} is searching…`
                : run?.status === "submitted"
                  ? `${name} submitted ${run.findingCount} listing${run.findingCount === 1 ? "" : "s"}`
                  : run?.status === "empty"
                    ? `${name} finished with no usable listings`
                    : error
                      ? `${name} could not start`
                      : `Emily will search with ${name}`}
          </h2>
          <p className="muted small" style={{ margin: 0 }}>
            {!signedIn
              ? "Same operator password as the desktop. Findings are scored in the list below."
              : waiting
                ? agent === "grok"
                  ? "Webhook is fire-and-forget. New listings appear here once Grok Bot submits through MCP."
                  : "Pi is searching live marketplaces through Tavily. This can take up to a minute."
                : run?.status === "submitted"
                  ? "Those listings are scored with the rest of the pipeline below."
                  : run?.status === "empty"
                    ? agent === "grok"
                      ? "Check the Bot chat if you expected hits."
                      : "Try a broader brief, or switch back to Grok Bot."
                    : "Grok Bot is the default. Toggle Pi on if you want the in-process scout instead."}
          </p>
        </div>
        <AgentToggle value={agent} onChange={setAgent} />
      </div>

      {!signedIn && (
        <div style={{ marginTop: 14 }}>
          <GateSignIn onSignedIn={() => setSignedIn(true)} />
        </div>
      )}

      {error && signedIn && (
        <p className="small" style={{ color: "var(--bad)", margin: "12px 0 0" }}>
          {error}
        </p>
      )}

      {signedIn && run?.requestId && (
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          requestId <code className="mono">{run.requestId}</code>
          {agent === "grok" ? (
            <>
              {" · "}
              <Link href="/desktop">Bot chat</Link>
            </>
          ) : null}
        </p>
      )}
    </section>
  );
}
