"use client";

import { useState } from "react";
import { DESTINATIONS, DEFAULT_DESTINATION } from "@/lib/destinations";

const SIZE_CHIPS = ["UK 8", "UK 9", "UK 10", "US 9", "US 10", "EU 43", "EU 44", "25.5cm", "26cm", "27cm"];

export function RequirementsForm({
  hidden,
  initial = {},
}: {
  hidden: Record<string, string | undefined>;
  initial?: { budget?: string; dest?: string; size?: string };
}) {
  const [size, setSize] = useState(initial.size ?? "");
  const addSize = (chip: string) => setSize((prev) => (prev.trim() ? `${prev.trim()}, ${chip}` : chip));

  return (
    <form action="/results" method="GET" className="search-form">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}

      <div className="field">
        <label className="small" htmlFor="budget">Maximum budget (£, landed cost)</label>
        <input id="budget" name="budget" type="number" min={0} step={1} placeholder="e.g. 300" defaultValue={initial.budget} />
      </div>

      <div className="field">
        <label className="small" htmlFor="dest">Where are you shipping to?</label>
        <select id="dest" name="dest" defaultValue={initial.dest ?? DEFAULT_DESTINATION}>
          {DESTINATIONS.map((d) => (
            <option key={d.id} value={d.id}>{d.flag} {d.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="small" htmlFor="size">Sizes you&apos;ll take</label>
        <input id="size" name="size" type="text" placeholder="e.g. UK 9, 26cm" value={size} onChange={(e) => setSize(e.target.value)} />
        <div className="chiprow">
          {SIZE_CHIPS.map((c) => (
            <button key={c} type="button" className="chip pick" onClick={() => addSize(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="search-row">
        <button type="submit" className="btn primary">Find opportunities →</button>
      </div>
    </form>
  );
}
