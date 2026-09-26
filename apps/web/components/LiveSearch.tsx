"use client";

import { useEffect, useState } from "react";
import type { DiscoveryBrief, DiscoveryFinding } from "@/lib/agent/discoveryAgent";

type State =
  | { status: "loading" }
  | { status: "done"; findings: DiscoveryFinding[] }
  | { status: "error"; message: string };

export function LiveSearch({ brief }: { brief: DiscoveryBrief }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    fetch("/api/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(brief),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({ status: "error", message: data.error ?? "Live search failed" });
          return;
        }
        setState({ status: "done", findings: data.findings });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : "Live search failed" });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(brief)]);

  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 4px" }}>Live marketplace scan</h2>
      <p className="muted small" style={{ margin: "0 0 12px" }}>
        A sourcing agent searching the live web via Tavily, right now — separate from the scored opportunities
        below, which still run against the fixed prototype dataset (see the README).
      </p>

      {state.status === "loading" && <p className="muted small">Searching the web…</p>}

      {state.status === "error" && (
        <p className="small" style={{ color: "var(--bad)" }}>
          Couldn&apos;t reach the discovery agent: {state.message}
        </p>
      )}

      {state.status === "done" && state.findings.length === 0 && (
        <p className="muted small">No live listings turned up for this brief.</p>
      )}

      {state.status === "done" && state.findings.length > 0 && (
        <div className="list">
          {state.findings.map((f) => (
            <a key={f.url} href={f.url} target="_blank" rel="noopener noreferrer" className="row" style={{ gridTemplateColumns: "1fr auto" }}>
              <div style={{ minWidth: 0 }}>
                <div className="title">{f.title}</div>
                {f.snippet && <div className="gloss">{f.snippet}</div>}
                <div className="meta">
                  {f.source && <span className="chip src">{f.source}</span>}
                </div>
              </div>
              <div className="money">
                {f.price && <div className="big num">{f.price}</div>}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
