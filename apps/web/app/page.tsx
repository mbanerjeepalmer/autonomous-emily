import Link from "next/link";
import { runPipeline } from "@/lib/pipeline";
import { brandById, refById } from "@/lib/data/references";
import { RULES, SOURCE_COSTS } from "@/lib/config";
import { gbp, money, pct } from "@/lib/format";
import { ShoePhoto } from "@/components/ShoePhoto";
import { Confidence } from "@/components/Confidence";
import { DecisionBadge } from "@/components/Decision";
import type { Opportunity } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "flagged", label: "Flagged" },
  { id: "review", label: "Needs review" },
  { id: "pass", label: "Passed" },
  { id: "no-match", label: "No match" },
] as const;

const STATUS_LABEL: Record<Opportunity["status"], string> = { flagged: "Flagged", review: "Review", pass: "Pass", "no-match": "No match" };

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "all" } = await searchParams;
  const all = runPipeline();
  const shown = tab === "all" ? all : all.filter((o) => o.status === tab);
  const flagged = all.filter((o) => o.status === "flagged");
  const count = (s: string) => (s === "all" ? all.length : all.filter((o) => o.status === s).length);

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Opportunities</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Flag rule: confidence ≥ {pct(RULES.flagConfidence)}, margin ≥ {pct(RULES.minMargin)}, expected profit ≥ {gbp(RULES.minExpectedProfit)}, ≥ {RULES.minComps} comps.
          </p>
        </div>
      </div>

      <section className="stats">
        <div className="stat"><div className="label">Scanned</div><div className="value num">{all.length}</div></div>
        <div className="stat"><div className="label">Identified</div><div className="value num">{all.filter((o) => o.match && !o.match.conflicts.length).length}</div></div>
        <div className="stat"><div className="label">Flagged</div><div className="value num" style={{ color: "var(--good)" }}>{flagged.length}</div></div>
        <div className="stat"><div className="label">Needs review</div><div className="value num" style={{ color: "var(--warn)" }}>{count("review")}</div></div>
        <div className="stat"><div className="label">Flagged upside</div><div className="value num">{gbp(flagged.reduce((s, o) => s + (o.expectedProfit ?? 0), 0))}</div></div>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "all" ? "/" : `/?tab=${t.id}`} className={`tab ${tab === t.id ? "active" : ""}`}>
            {t.label} · {count(t.id)}
          </Link>
        ))}
      </nav>

      <div className="list">
        {shown.map((o) => {
          const l = o.listing;
          const ref = o.match ? refById(o.match.refId) : null;
          const src = SOURCE_COSTS[l.source];
          return (
            <Link key={l.id} href={`/listing/${l.id}`} className="row">
              <ShoePhoto sketch={l.photos[0].sketch} kind={l.photos[0].kind} uid={`t-${l.photos[0].id}`} className="thumb" />
              <div style={{ minWidth: 0 }}>
                <div className="title">{l.title}</div>
                {l.titleGloss && <div className="gloss">“{l.titleGloss}”</div>}
                <div className="meta">
                  <span className="chip src">{src.flag} · {src.label}</span>
                  {l.size && <span className="chip">{l.size}</span>}
                  <span className="chip">{l.condition}</span>
                  <span className="chip">{l.photos.length} photo{l.photos.length === 1 ? "" : "s"}</span>
                </div>
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
        })}
        {!shown.length && <p className="muted">Nothing here.</p>}
      </div>
    </main>
  );
}
