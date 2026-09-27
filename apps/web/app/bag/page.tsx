"use client";

// Everything the buyer has chosen to keep, independent of any one search —
// stored in this browser only, same as decisions (see components/Decision.tsx).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBag } from "@/lib/clientState";
import { directionTermsFor } from "@/lib/direction";
import { OpportunityRow } from "@/components/OpportunityRow";
import { DEFAULT_DESTINATION } from "@/lib/destinations";
import type { Opportunity } from "@/lib/types";

export default function BagPage() {
  const bag = useBag();
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/opportunities")
      .then(async (res) => {
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setOpportunities(data as Opportunity[]);
      })
      .catch(() => {
        if (!cancelled) setOpportunities([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ids = useMemo(
    () => Object.entries(bag.ids).sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id),
    [bag.ids]
  );
  const byId = useMemo(
    () => new Map(opportunities.map((o) => [o.listing.id, o])),
    [opportunities],
  );
  const items = ids.map((id) => byId.get(id)).filter((o): o is Opportunity => !!o);

  function findMoreLikeThis() {
    const terms = directionTermsFor(ids, opportunities);
    const params = new URLSearchParams();
    if (terms.length) params.set("details", terms.join(", "));
    else if (items[0]) params.set("q", items[0].listing.title);
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
              href={`/listing/${encodeURIComponent(o.listing.id)}`}
              dest={DEFAULT_DESTINATION}
              showSelect={false}
            />
          ))
        ) : (
          <p className="muted">
            {ids.length
              ? "Those kept listings are no longer in the live set."
              : "Nothing in your bag yet — add items from the opportunities list."}
          </p>
        )}
      </div>
    </main>
  );
}
