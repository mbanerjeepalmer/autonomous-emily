"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";

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
      <main className="page page-narrow">
        <p className="small" style={{ margin: "0 0 12px" }}>
          <Link href="/" className="muted">← Product search</Link>
        </p>
        <div className="hero">
          <h1>Operator sign-in</h1>
          <p className="muted">
            Gate password protects the Vercel app. Desktop access uses a separate short-lived JWT shared with Hetzner.
          </p>
          <form onSubmit={onLogin} className="search-form">
            <div className="field">
              <label className="small" htmlFor="desktop-password">Password</label>
              <input
                id="desktop-password"
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
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <header className="topbar">
        <span className="brand">Grok Bot<span>·</span>Desktop</span>
        <span className="small muted">via Hetzner noVNC</span>
        <nav className="nav" style={{ marginLeft: 8 }}>
          <Link href="/results">Results</Link>
          <Link href="/">Search</Link>
        </nav>
        <button type="button" className="btn" style={{ marginLeft: "auto" }} onClick={openDesktop} disabled={loading}>
          {loading ? "Refreshing…" : session ? "Refresh session" : "Connect"}
        </button>
      </header>

      {error ? (
        <p className="small" style={{ color: "var(--bad)", padding: "0.75rem 1rem", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {session ? (
        <iframe
          title="Grok Bot desktop"
          src={session.url}
          style={{ flex: 1, minHeight: 0, width: "100%", border: 0, background: "#000" }}
          allow="clipboard-read; clipboard-write"
        />
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center" }}>
            <p className="muted">Not connected yet.</p>
            <button type="button" className="btn primary" onClick={openDesktop} disabled={loading}>
              Connect to desktop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
