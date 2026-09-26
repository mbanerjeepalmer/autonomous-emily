"use client";

import { useState } from "react";

const EXAMPLES = [
  "Yohji Yamamoto side-zip boots",
  "visvim FBT, brown suede",
  "Any Comme des Garçons Homme Plus archive shoes",
  "Y-3 Qasa High",
];

export function SearchForm({ brands }: { brands: { id: string; name: string }[] }) {
  const [q, setQ] = useState("");

  return (
    <form action="/insider" method="GET" className="search-form">
      <textarea
        name="q"
        rows={3}
        placeholder="What are you hunting for? e.g. “Yohji Yamamoto side-zip boots” or “visvim FBT in brown suede”"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      <div className="chiprow">
        <span className="small muted">Try:</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip pick" onClick={() => setQ(ex)}>
            {ex}
          </button>
        ))}
      </div>

      <div className="chiprow">
        <span className="small muted">Or a brand:</span>
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            className="chip pick"
            onClick={() => setQ((prev) => (prev.trim() ? `${prev.trim()} ${b.name}` : b.name))}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="search-row">
        <button type="submit" className="btn primary">Next: add insider details →</button>
      </div>
    </form>
  );
}
