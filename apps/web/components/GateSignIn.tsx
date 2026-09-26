"use client";

import { FormEvent, useState } from "react";

export function GateSignIn({
  onSignedIn,
  disabled,
}: {
  onSignedIn: () => void;
  disabled?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
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
      setPassword("");
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="search-form" style={{ gap: 10 }}>
      <div className="field">
        <label className="small" htmlFor="agent-gate-password">Operator password</label>
        <input
          id="agent-gate-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={disabled || loading}
        />
      </div>
      {error && <p className="small" style={{ color: "var(--bad)", margin: 0 }}>{error}</p>}
      <div className="search-row">
        <button type="submit" className="btn primary" disabled={disabled || loading || !password}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
