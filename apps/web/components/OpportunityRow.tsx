import Link from "next/link";
import { brandById, refById } from "@/lib/data/references";
import { SOURCE_COSTS } from "@/lib/config";
import { gbp, money } from "@/lib/format";
import { shippingEase, EASE_TONE, type DestinationId } from "@/lib/destinations";
import { ShoePhoto } from "@/components/ShoePhoto";
import { Confidence } from "@/components/Confidence";
import { DecisionBadge } from "@/components/Decision";
import { RowControls } from "@/components/RowControls";
import type { Opportunity } from "@/lib/types";
import type { Relevance } from "@/lib/relevance";

const STATUS_LABEL: Record<Opportunity["status"], string> = { flagged: "Flagged", review: "Review", pass: "Pass", "no-match": "No match" };

export function OpportunityRow({
  o,
  href,
  dest,
  rel,
  searching,
  budget,
  showSelect = true,
}: {
  o: Opportunity;
  href: string;
  dest: DestinationId;
  rel?: Relevance;
  searching?: boolean;
  budget?: number;
  showSelect?: boolean;
}) {
  const l = o.listing;
  const ref = o.match ? refById(o.match.refId) : null;
  const src = SOURCE_COSTS[l.source];
  const ease = shippingEase(l.source, dest);
  const withinBudget = budget == null || o.landed.total <= budget;

  return (
    <Link href={href} className="row">
      <div>
        <ShoePhoto sketch={l.photos[0].sketch} kind={l.photos[0].kind} uid={`t-${l.photos[0].id}`} className="thumb" />
        <RowControls id={l.id} showSelect={showSelect} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="title">{l.title}</div>
        {l.titleGloss && <div className="gloss">“{l.titleGloss}”</div>}
        <div className="meta">
          <span className="chip src">{src.flag} · {src.label}</span>
          {l.size && <span className="chip">{l.size}</span>}
          <span className="chip">{l.condition}</span>
          <span className="chip">{l.photos.length} photo{l.photos.length === 1 ? "" : "s"}</span>
        </div>
        {searching && rel && rel.matched.length > 0 && (
          <div className="meta" style={{ marginTop: 4 }}>
            <span className="small muted">Matches:</span>
            {rel.matched.map((m) => (
              <span key={m} className="chip hit">{m}</span>
            ))}
          </div>
        )}
      </div>
      <div className="col-match" style={{ minWidth: 0 }}>
        {ref && o.match ? (
          <>
            <div className="small" style={{ fontWeight: 600, marginBottom: 4 }}>
              {brandById(ref.brandId).name} — {ref.model}
            </div>
            <Confidence value={o.match.confidence} label="Match" />
          </>
        ) : (
          <span className="muted small">No reference match</span>
        )}
        <div className={`ease ${EASE_TONE[ease.level]}`} style={{ marginTop: 8 }}>
          <span className="dot" /> {ease.label} shipping · {ease.days}
        </div>
      </div>
      <div className="money">
        <div className="small muted">
          {money(l.price)} → landed <span className="num">{gbp(o.landed.total)}</span>
        </div>
        {o.valuation && <div className="big num">≈ {gbp(o.valuation.estimate)}</div>}
        {o.expectedProfit != null && (
          <div className="small num" style={{ color: o.expectedProfit > 0 ? "var(--good)" : "var(--bad)" }}>
            {o.expectedProfit > 0 ? "+" : ""}{gbp(o.expectedProfit)} expected
          </div>
        )}
        {budget != null && (
          <div className="small num" style={{ color: withinBudget ? "var(--good)" : "var(--bad)" }}>
            {withinBudget ? "Within budget" : `Over by ${gbp(o.landed.total - budget)}`}
          </div>
        )}
      </div>
      <div className="col-status">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span className={`badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
          <DecisionBadge id={l.id} />
        </div>
        <div className="reason">{o.reasons[0]}</div>
      </div>
    </Link>
  );
}
