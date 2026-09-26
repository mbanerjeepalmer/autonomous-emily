"use client";

// Everything the buyer has chosen to keep, independent of any one search —
// stored in this browser only, same as decisions (see components/Decision.tsx).

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBag } from "@/lib/clientState";
import { getOpportunity } from "@/lib/pipeline";
import { directionTermsFor } from "@/lib/direction";
import { OpportunityRow } from "@/components/OpportunityRow";
import { DEFAULT_DESTINATION } from "@/lib/destinations";

export default function BagPage() {
  const bag = useBag();
  const router = useRouter();

  const ids = useMemo(
    () => Object.entries(bag.ids).sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id),
    [bag.ids]
  );
  const items = ids.map((id) => getOpportunity(id)).filter((o): o is NonNullable<typeof o> => !!o);

  function findMoreLikeThis() {
    const terms = directionTermsFor(ids);
    const params = new URLSearchParams();
    if (terms.length) params.set("details", terms.join(", "));
    router.push(params.toString() ? `/results?${params.toString()}` : "/results");
  }

  return (
    <main className="page">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/results" className="muted">← Opportunities</Link>
      </p>

      <div className="page-head">
        <div>
          <h1>Your shopping bag</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Kept in this browser only — nothing here is bought automatically.
          </p>
        </div>
        {items.length > 0 && (
          <button type="button" className="btn primary" onClick={findMoreLikeThis}>
            Find more like these →
          </button>
        )}
      </div>

      <div className="list">
        {!bag.ready ? null : items.length ? (
          items.map((o) => (
            <OpportunityRow
              key={o.listing.id}
              o={o}
              href={`/listing/${o.listing.id}`}
              dest={DEFAULT_DESTINATION}
              showSelect={false}
            />
          ))
        ) : (
          <p className="muted">Nothing in your bag yet — add items from the opportunities list.</p>
        )}
      </div>
    </main>
  );
}
