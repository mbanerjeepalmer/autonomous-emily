"use client";

import { useState } from "react";

function ChipField({
  name,
  label,
  placeholder,
  chips,
  initial = "",
}: {
  name: string;
  label: string;
  placeholder: string;
  chips: string[];
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  const add = (chip: string) => setValue((prev) => (prev.trim() ? `${prev.trim()}, ${chip}` : chip));

  return (
    <div className="field">
      <label className="small" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="text" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      {chips.length > 0 && (
        <div className="chiprow">
          {chips.map((c) => (
            <button key={c} type="button" className="chip pick" onClick={() => add(c)}>{c}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function InsiderForm({
  q,
  agent,
  variantChips,
  materialChips,
  detailChips,
  keywordChips,
  colorChips,
  initial = {},
}: {
  q: string;
  agent: string;
  variantChips: string[];
  materialChips: string[];
  detailChips: string[];
  keywordChips: string[];
  colorChips: string[];
  initial?: { brand?: string; material?: string; color?: string; details?: string; notes?: string };
}) {
  return (
    <form action="/requirements" method="GET" className="search-form">
      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="agent" value={agent} />

      <ChipField
        name="brand"
        label="Brand spelling / common misspellings"
        placeholder="e.g. visvim, ビズビム, vizvim"
        chips={variantChips}
        initial={initial.brand}
      />
      <ChipField
        name="material"
        label="Fabric or materials"
        placeholder="e.g. suede, sashiko canvas"
        chips={materialChips}
        initial={initial.material}
      />
      <ChipField
        name="color"
        label="Colour scheme"
        placeholder="e.g. brown, indigo"
        chips={colorChips}
        initial={initial.color}
      />
      <ChipField
        name="details"
        label="Distinguishing details / silhouette keywords"
        placeholder="e.g. fringe vamp, side zip, patchwork panels"
        chips={[...detailChips, ...keywordChips]}
        initial={initial.details}
      />

      <div className="field insider-note">
        <label className="small" htmlFor="notes">Anything else that might help</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder={'Anything at all — e.g. "I think this is listed more on Japanese sites" or "seller might have it under a different spelling"'}
          defaultValue={initial.notes}
        />
      </div>

      <div className="search-row">
        <button type="submit" className="btn primary">Next: purchase requirements →</button>
      </div>
    </form>
  );
}
