"use client";

// The buyer's steering wheel: select a few rows above and say "go more into
// this direction", or just type it. Both paths turn into extra `details`
// terms fed back through the same relevance scoring as the original search
// (see lib/direction.ts), then re-run the search — no separate AI call.

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelection } from "@/lib/clientState";
import { directionTermsFor, mergeTerms, parseInstruction } from "@/lib/direction";

export function RefineBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selection = useSelection();
  const [text, setText] = useState("");

  const selectedIds = useMemo(() => Object.keys(selection.ids), [selection.ids]);
  const count = selectedIds.length;

  function applyDirection(extra: string[]) {
    if (!extra.length) return;
    const params = new URLSearchParams(searchParams.toString());
    const merged = mergeTerms(params.get("details"), extra);
    if (merged) params.set("details", merged);
    params.delete("tab");
    selection.clear();
    setText("");
    router.push(`/results?${params.toString()}`);
  }

  function refineFromSelection() {
    applyDirection(directionTermsFor(selectedIds));
  }

  function submitText(e: FormEvent) {
    e.preventDefault();
    applyDirection([...directionTermsFor(selectedIds), ...parseInstruction(text)]);
  }

  return (
    <form className="refine-bar" onSubmit={submitText}>
      <div className="refine-bar-inner">
        <div className="refine-row">
          <span className="small muted">
            {count > 0 ? `${count} selected as a direction` : "Select a few items above to point me somewhere"}
          </span>
          {count > 0 && (
            <>
              <button type="button" className="btn primary" onClick={refineFromSelection}>
                Look more into this direction →
              </button>
              <button type="button" className="btn" onClick={() => selection.clear()}>
                Clear selection
              </button>
            </>
          )}
        </div>
        <div className="refine-row">
          <input
            type="text"
            className="refine-input"
            placeholder={'Tell me more — e.g. "I like your selection, go more into this direction" or "more black leather boots"'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="btn primary">Send</button>
        </div>
      </div>
    </form>
  );
}
