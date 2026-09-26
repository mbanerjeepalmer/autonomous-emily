"use client";

// Sits inside a row that's itself a <Link>, so every handler here has to
// stop the click before it bubbles to the link and navigates away.

import type { MouseEvent } from "react";
import { useSelection, useBag } from "@/lib/clientState";

export function RowControls({ id, showSelect = true }: { id: string; showSelect?: boolean }) {
  const selection = useSelection();
  const bag = useBag();
  const selected = selection.ready && selection.has(id);
  const bagged = bag.ready && bag.has(id);

  const stop = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <div className="row-controls">
      {showSelect && (
        <button
          type="button"
          className={`ctrl-toggle ${selected ? "on" : ""}`}
          onClick={stop(() => selection.toggle(id))}
          title="Use this item as a direction to refine on"
        >
          {selected ? "✓ Selected" : "Select"}
        </button>
      )}
      <button
        type="button"
        className={`ctrl-toggle bag ${bagged ? "on" : ""}`}
        onClick={stop(() => bag.toggle(id))}
        title="Keep in your shopping bag"
      >
        {bagged ? "✓ In bag" : "+ Bag"}
      </button>
    </div>
  );
}
