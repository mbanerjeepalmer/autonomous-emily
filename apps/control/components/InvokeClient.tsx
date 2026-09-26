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
    'Reply in chat with: webhook ok from control UI',
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
      <form
        onSubmit={onLogin}
        style={{
          maxWidth: 420,
          margin: "4rem auto",
          padding: "1.5rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: "1.35rem" }}>Sign in to invoke</h1>
        <p style={{ color: "var(--muted)" }}>
          Same operator password as the desktop control surface.
        </p>
        <label style={{ display: "block", marginBottom: 12 }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--ink)",
            }}
          />
        </label>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: 0,
            borderRadius: 8,
            padding: "0.7rem 1rem",
            fontWeight: 600,
          }}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
    );
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <p style={{ color: "var(--muted)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Autonomous Emily
      </p>
      <h1 style={{ marginTop: 0 }}>Invoke Grok Bot</h1>
      <p style={{ color: "var(--muted)" }}>
        Sends a webhook to the Bot routine. A 200 means the run started — check the
        Bot chat for the result.{" "}
        <Link href="/desktop">Open desktop</Link>
      </p>
      <form onSubmit={onInvoke}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Task
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            required
            rows={5}
            style={{
              display: "block",
              width: "100%",
              marginTop: 6,
              padding: "0.75rem",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-elevated)",
              color: "var(--ink)",
              resize: "vertical",
            }}
          />
        </label>
        {error ? <p style={{ color: "var(--danger)" }}>{error}</p> : null}
        {result?.ok ? (
          <p style={{ color: "var(--muted)" }}>
            Started (webhook {result.status}). requestId:{" "}
            <code>{result.requestId}</code>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || !task.trim()}
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: 0,
            borderRadius: 8,
            padding: "0.7rem 1.1rem",
            fontWeight: 600,
          }}
        >
          {loading ? "Sending…" : "Run"}
        </button>
      </form>
    </main>
  );
}
