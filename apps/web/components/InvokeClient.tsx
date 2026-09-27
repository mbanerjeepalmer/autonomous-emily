"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type RunStatus = "pending" | "submitted" | "empty";

type InvokeResult = {
  ok?: boolean;
  status?: number | RunStatus;
  requestId?: string;
  error?: string;
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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [run, setRun] = useState<PolledRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result?.ok || !result.requestId) return;
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
  }, [result]);

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
      const res = await fetch("/api/emily/invoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
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

  const resultsHref = result?.requestId
    ? `/results?requestId=${encodeURIComponent(result.requestId)}&q=${encodeURIComponent(task.slice(0, 120))}`
    : "/results";

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
          Operator shortcut. The main search flow starts Grok Bot from results. Grok Bot sends findings back through MCP.
        </p>
        <form onSubmit={onInvoke} className="search-form">
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
          {result?.ok ? (
            <p className="small muted">
              Started (webhook {result.status}). requestId:{" "}
              <code className="mono">{result.requestId}</code>.{" "}
              {run?.status === "submitted" ? (
                <>Bot submitted {run.findingCount} finding{run.findingCount === 1 ? "" : "s"}. See <Link href={resultsHref}>this run</Link>.</>
              ) : run?.status === "empty" ? (
                <>Bot finished with no usable listings. See <Link href="/desktop">Bot chat</Link>.</>
              ) : (
                <>Waiting for MCP submit… Check <Link href={resultsHref}>this run</Link> or <Link href="/desktop">Bot chat</Link>.</>
              )}
            </p>
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
