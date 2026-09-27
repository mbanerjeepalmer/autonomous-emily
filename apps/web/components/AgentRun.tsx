"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { briefToPrompt, type DiscoveryBrief } from "@/lib/agent/brief";
import { agentRunStorageKey } from "@/lib/agent/provider";
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

function withRequestId(queryString: string, requestId: string): string {
  const params = new URLSearchParams(queryString);
  params.set("requestId", requestId);
  return params.toString();
}

class AuthRequiredError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthRequiredError";
  }
}

async function invokeAgent(brief: DiscoveryBrief): Promise<RunSnapshot> {
  const res = await fetch("/api/emily/invoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task: briefToPrompt(brief), context: brief }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthRequiredError();
  if (!res.ok || data.ok === false) {
    throw new Error(typeof data.error === "string" ? data.error : `Agent failed (${res.status})`);
  }

  const requestId = typeof data.requestId === "string" ? data.requestId : "";
  if (!requestId) throw new Error("Agent did not return a requestId");

  return { requestId, status: "pending", findingCount: 0 };
}

async function startOrResume(brief: DiscoveryBrief, pinnedId?: string): Promise<RunSnapshot> {
  const key = agentRunStorageKey(briefKey(brief));
  if (pinnedId) {
    const stored = readSnapshot(key);
    if (stored?.requestId === pinnedId) return stored;
    return { requestId: pinnedId, status: "pending", findingCount: 0 };
  }

  const stored = readSnapshot(key);
  if (stored?.requestId) return stored;

  const existing = inFlight.get(key);
  if (existing) return existing;

  const work = invokeAgent(brief).then((snap) => {
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
  initiallySignedIn,
  queryString,
  requestId: urlRequestId,
}: {
  brief: DiscoveryBrief;
  initiallySignedIn: boolean;
  queryString: string;
  requestId?: string;
}) {
  const router = useRouter();
  const key = useMemo(() => briefKey(brief), [brief]);
  const briefRef = useRef(brief);
  briefRef.current = brief;
  const queryRef = useRef(queryString);
  queryRef.current = queryString;

  const [signedIn, setSignedIn] = useState(initiallySignedIn);
  const [run, setRun] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const storageKey = agentRunStorageKey(key);

    const pinUrl = (requestId: string) => {
      const next = withRequestId(queryRef.current, requestId);
      const current = new URLSearchParams(queryRef.current).get("requestId");
      if (current === requestId) return;
      router.replace(next ? `/results?${next}` : "/results");
    };

    const apply = (snap: RunSnapshot, { refresh }: { refresh: boolean }) => {
      if (cancelled) return;
      setRun(snap);
      writeSnapshot(storageKey, snap);
      pinUrl(snap.requestId);
      if (refresh) router.refresh();
    };

    const pollUntilSettled = (requestId: string) => {
      let attempts = 0;
      const tick = async () => {
        attempts += 1;
        try {
          const next = await pollRun(requestId);
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
        } else if (!cancelled) {
          setTimedOut(true);
        }
      };
      timer = setTimeout(tick, POLL_MS);
    };

    const start = async () => {
      setError(null);
      setTimedOut(false);
      setStarting(true);
      try {
        const snap = await startOrResume(briefRef.current, urlRequestId);
        if (cancelled) return;

        const live = await pollRun(snap.requestId);
        if (cancelled) return;

        if (live) {
          apply(live, { refresh: true });
          if (live.status === "pending") pollUntilSettled(live.requestId);
          return;
        }

        apply(snap, { refresh: snap.status !== "pending" });
        if (snap.status === "pending") pollUntilSettled(snap.requestId);
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
  }, [key, router, signedIn, urlRequestId]);

  const name = "Grok Bot";
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
                ? "Webhook is fire-and-forget. New listings appear here once Grok Bot submits through MCP."
                : run?.status === "submitted"
                  ? "Those listings are scored with the rest of the pipeline below."
                  : run?.status === "empty"
                    ? "Check the Bot chat if you expected hits."
                    : "Grok Bot will search this brief."}
          </p>
        </div>
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

      {timedOut && signedIn && run?.status === "pending" && (
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          Still waiting after ~90 seconds. The bot may still submit — reload this page or check{" "}
          <Link href="/desktop">Bot chat</Link>.
        </p>
      )}

      {signedIn && run?.requestId && (
        <p className="small muted" style={{ margin: "12px 0 0" }}>
          requestId <code className="mono">{run.requestId}</code>
          {" · "}
          <Link href="/desktop">Bot chat</Link>
        </p>
      )}
    </section>
  );
}
