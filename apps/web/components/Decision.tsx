"use client";

// 6. HUMAN IN THE LOOP — the reviewer makes the final call.
// Prototype stores decisions in this browser only; the real app would persist
// them server-side and feed them back as labels to tune thresholds.

import { useEffect, useState } from "react";

type Decision = { status: "bought" | "dismissed" | "asked"; note: string; at: string };
const KEY = "emily:decisions";

function load(): Record<string, Decision> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function save(all: Record<string, Decision>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function useDecision(id: string) {
  const [d, setD] = useState<Decision | null>(null);
  useEffect(() => {
    setD(load()[id] ?? null);
  }, [id]);
  const set = (next: Decision | null) => {
    const all = load();
    if (next) all[id] = next;
    else delete all[id];
    save(all);
    setD(next);
  };
  return [d, set] as const;
}

const LABEL = { bought: "Bought", dismissed: "Dismissed", asked: "Asked seller" } as const;

export function DecisionBadge({ id }: { id: string }) {
  const [d] = useDecision(id);
  if (!d) return null;
  return <span className={`badge ${d.status === "asked" ? "review" : d.status}`}>{LABEL[d.status]}</span>;
}

export function DecisionPanel({ id, url }: { id: string; url: string }) {
  const [d, set] = useDecision(id);
  const [note, setNote] = useState("");
  useEffect(() => setNote(d?.note ?? ""), [d]);
  const decide = (status: Decision["status"]) => set({ status, note, at: new Date().toISOString() });

  return (
    <div className="card">
      <h2>Your call</h2>
      {d ? (
        <p className="small" style={{ marginTop: 0 }}>
          <span className={`badge ${d.status === "asked" ? "review" : d.status}`}>{LABEL[d.status]}</span>{" "}
          <span className="muted">{new Date(d.at).toLocaleString("en-GB")}</span>
        </p>
      ) : (
        <p className="small muted" style={{ marginTop: 0 }}>Check the evidence, then decide. Nothing is bought automatically.</p>
      )}
      <textarea rows={2} placeholder="Notes (e.g. asked for insole photo)" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="btns" style={{ marginTop: 10 }}>
        <a className="btn" href={url} target="_blank" rel="noreferrer">
          Open listing
        </a>
        <button type="button" className="btn primary" onClick={() => decide("bought")}>Mark bought</button>
        <a className="btn" href={url} target="_blank" rel="noreferrer" onClick={() => decide("asked")}>
          Ask seller
        </a>
        <button type="button" className="btn danger" onClick={() => decide("dismissed")}>Dismiss</button>
        {d && (
          <button type="button" className="btn" onClick={() => set(null)}>Undo</button>
        )}
      </div>
      <p className="small muted" style={{ margin: "10px 0 0" }}>
        Ask seller opens the listing so you can message there. The badge is only stored in this browser.
      </p>
    </div>
  );
}
