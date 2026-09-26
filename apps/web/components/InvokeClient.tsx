"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import type { DiscoveryFinding } from "@/lib/agent/discoveryAgent";

type RunStatus = "pending" | "submitted" | "empty";

type InvokeResult = {
  ok?: boolean;
  status?: number | RunStatus;
  requestId?: string;
  error?: string;
  findings?: DiscoveryFinding[];
};

type PolledRun = {
  requestId: string;
  status: RunStatus;
  findingCount: number;
};

export function InvokeClient({ initiallySignedIn }: { initiallySignedIn: boolean }) {
  const [signedIn, setSignedIn] = useState(initiallySignedIn);
  const [password, setPassword] = useState("");
  const [task, setTask] = useState(
    "Find Japanese designer footwear listings for sale",
  );
  const [provider, setProvider] = useState<"grok" | "pi">("grok");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [run, setRun] = useState<PolledRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (provider !== "grok" || !result?.ok || !result.requestId) return;
    const requestId = result.requestId;
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/emily/runs/${encodeURIComponent(requestId)}`);
        if (cancelled) return;
        if (res.status === 404) return;
        const data = await res.json();
        if (!res.ok) return;
        setRun({
          requestId: data.requestId,
          status: data.status,
          findingCount: data.findingCount,
        });
        if (data.status === "submitted" || data.status === "empty") return true;
      } catch {
        // Keep polling; the bot may not have submitted yet.
      }
      return false;
    };

    const tick = async () => {
      attempts += 1;
      const done = await poll();
      if (!cancelled && !done && attempts < 45) {
        timer = setTimeout(tick, 2000);
      }
    };

    let timer: ReturnType<typeof setTimeout> = setTimeout(tick, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [provider, result]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setSignedIn(true);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onInvoke(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setRun(null);
    try {
      const res = await fetch(provider === "grok" ? "/api/emily/invoke" : "/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider === "grok" ? { task } : { query: task }),
      });
      const data = (await res.json()) as InvokeResult;
      if (!res.ok) {
        throw new Error(data.error || `Invoke failed (${res.status})`);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoke failed");
    } finally {
      setLoading(false);
    }
  }

  if (!signedIn) {
    return (
      <main className="page page-narrow">
        <div className="hero">
          <h1>Sign in to invoke</h1>
          <p className="muted">Same operator password as the desktop control surface.</p>
          <form onSubmit={onLogin} className="search-form">
            <div className="field">
              <label className="small" htmlFor="invoke-password">Password</label>
              <input
                id="invoke-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="small" style={{ color: "var(--bad)" }}>{error}</p>}
            <div className="search-row">
              <button type="submit" className="btn primary" disabled={loading}>
                {loading ? "Signing in…" : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/" className="muted">← Product search</Link>
        {" · "}
        <Link href="/desktop" className="muted">Open desktop →</Link>
      </p>
      <div className="hero">
        <h1>Run a sourcing agent</h1>
        <p className="muted">
          Operator shortcut. The main search flow also starts Grok Bot (or Pi if
          toggled) from results. Grok Bot sends findings back through MCP; Pi
          searches with Tavily and stores them for scoring.
        </p>
        <form onSubmit={onInvoke} className="search-form">
          <fieldset disabled={loading} className="field">
            <legend className="small">Agent</legend>
            <label style={{ marginRight: 20 }}>
              <input
                type="radio"
                name="provider"
                checked={provider === "grok"}
                onChange={() => {
                  setProvider("grok");
                  setResult(null);
                  setRun(null);
                  setError(null);
                }}
              />{" "}
              Grok Bot
            </label>
            <label>
              <input
                type="radio"
                name="provider"
                checked={provider === "pi"}
                onChange={() => {
                  setProvider("pi");
                  setResult(null);
                  setRun(null);
                  setError(null);
                }}
              />{" "}
              Pi
            </label>
          </fieldset>
          <div className="field">
            <label className="small" htmlFor="invoke-task">Task</label>
            <textarea
              id="invoke-task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              required
              rows={5}
            />
          </div>
          {error && <p className="small" style={{ color: "var(--bad)" }}>{error}</p>}
          {result?.ok && provider === "grok" ? (
            <p className="small muted">
              Started (webhook {result.status}). requestId:{" "}
              <code className="mono">{result.requestId}</code>.{" "}
              {run?.status === "submitted" ? (
                <>Bot submitted {run.findingCount} finding{run.findingCount === 1 ? "" : "s"}. See <Link href="/results">results</Link>.</>
              ) : run?.status === "empty" ? (
                <>Bot finished with no usable listings. See <Link href="/desktop">Bot chat</Link>.</>
              ) : (
                <>Waiting for MCP submit… Check <Link href="/results">results</Link> or <Link href="/desktop">Bot chat</Link>.</>
              )}
            </p>
          ) : null}
          {result?.ok && provider === "pi" ? (
            <section aria-live="polite">
              <h2>Pi findings</h2>
              {result.requestId ? (
                <p className="small muted">
                  Stored as request <code className="mono">{result.requestId}</code>. Open <Link href="/results">results</Link> to score them.
                </p>
              ) : null}
              {result.findings?.length ? result.findings.map((finding) => (
                <p key={finding.url}>
                  <a href={finding.url} target="_blank" rel="noopener noreferrer">{finding.title}</a>
                  {finding.source ? ` · ${finding.source}` : ""}{finding.price ? ` · ${finding.price}` : ""}
                  {finding.snippet ? <><br /><span className="muted">{finding.snippet}</span></> : null}
                </p>
              )) : <p>No listings found for this task.</p>}
            </section>
          ) : null}
          <div className="search-row">
            <button type="submit" className="btn primary" disabled={loading || !task.trim()}>
              {loading ? "Sending…" : "Run"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
