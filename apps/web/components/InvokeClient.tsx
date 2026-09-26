"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type InvokeResult = {
  ok?: boolean;
  status?: number;
  requestId?: string;
  error?: string;
};

export function InvokeClient({ initiallySignedIn }: { initiallySignedIn: boolean }) {
  const [signedIn, setSignedIn] = useState(initiallySignedIn);
  const [password, setPassword] = useState("");
  const [task, setTask] = useState(
    'Reply in chat with: webhook ok from Emily',
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/desktop" className="muted">Open desktop →</Link>
      </p>
      <div className="hero">
        <h1>Invoke Grok Bot</h1>
        <p className="muted">
          Sends a webhook to the Bot routine. A 200 means the run started — check the Bot chat for the result.
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
          {result?.ok && (
            <p className="small muted">
              Started (webhook {result.status}). requestId: <code className="mono">{result.requestId}</code>
            </p>
          )}
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
