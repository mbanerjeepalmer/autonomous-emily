"use client";

import { FormEvent, useCallback, useState } from "react";

type SessionPayload = {
  url: string;
  token: string;
  expiresInSeconds: number;
};

export function DesktopClient({ initiallySignedIn }: { initiallySignedIn: boolean }) {
  const [signedIn, setSignedIn] = useState(initiallySignedIn);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);

  const openDesktop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/desktop/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not create desktop session");
      }
      setSession(data as SessionPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Session failed");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

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
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      setSignedIn(true);
      setPassword("");
      await openDesktop();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!signedIn) {
    return (
      <form
        onSubmit={onLogin}
        style={{
          maxWidth: 400,
          margin: "4rem auto",
          padding: "1.5rem",
          background: "var(--bg-elevated)",
          border: "1px solid var(--line)",
          borderRadius: 12,
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>Operator sign-in</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          Gate password protects the Vercel app. Desktop access uses a separate
          short-lived JWT shared with Hetzner.
        </p>
        <label style={{ display: "block", marginBottom: "0.4rem" }}>
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
              marginBottom: 12,
              padding: "0.65rem 0.75rem",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg)",
              color: "var(--ink)",
            }}
          />
        </label>
        {error ? (
          <p style={{ color: "var(--danger)", marginTop: 0 }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: 0,
            borderRadius: 8,
            padding: "0.7rem 1rem",
            fontWeight: 600,
            width: "100%",
          }}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          padding: "0.75rem 1rem",
          borderBottom: "1px solid var(--line)",
          background: "rgba(15, 20, 25, 0.92)",
        }}
      >
        <div>
          <strong>Grok Bot desktop</strong>
          <span style={{ color: "var(--muted)", marginLeft: 10, fontSize: "0.9rem" }}>
            via Hetzner noVNC
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={openDesktop}
            disabled={loading}
            style={{
              background: "var(--bg-elevated)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "0.45rem 0.8rem",
            }}
          >
            {loading ? "Refreshing…" : session ? "Refresh session" : "Connect"}
          </button>
        </div>
      </header>

      {error ? (
        <p style={{ color: "var(--danger)", padding: "0.75rem 1rem", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {session ? (
        <iframe
          title="Grok Bot desktop"
          src={session.url}
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            border: 0,
            background: "#000",
          }}
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
            padding: "2rem",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p>Not connected yet.</p>
            <button
              type="button"
              onClick={openDesktop}
              disabled={loading}
              style={{
                background: "var(--accent)",
                color: "var(--accent-ink)",
                border: 0,
                borderRadius: 8,
                padding: "0.7rem 1.1rem",
                fontWeight: 600,
              }}
            >
              Connect to desktop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
