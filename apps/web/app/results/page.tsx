import Link from "next/link";
import { runPipeline } from "@/lib/pipeline";
import { brandById, refById } from "@/lib/data/references";
import { RULES, SOURCE_COSTS } from "@/lib/config";
import { gbp, money, pct } from "@/lib/format";
import { DESTINATIONS, DEFAULT_DESTINATION, shippingEase, isDestinationId, EASE_TONE } from "@/lib/destinations";
import { relevance, hasCriteria, type SearchCriteria } from "@/lib/relevance";
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

type Params = {
  tab?: string;
  q?: string;
  dest?: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  budget?: string;
  size?: string;
};

function qs(params: Params, overrides: Partial<Params> = {}) {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function Results({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { tab = "all", q, brand, material, color, details, size } = params;
  const dest = isDestinationId(params.dest) ? params.dest : DEFAULT_DESTINATION;
  const destInfo = DESTINATIONS.find((d) => d.id === dest)!;
  const budget = params.budget && Number.isFinite(Number(params.budget)) ? Number(params.budget) : undefined;

  const criteria: SearchCriteria = { q, brand, material, color, details, size };
  const searching = hasCriteria(criteria);
  const withinBudget = (o: Opportunity) => budget == null || o.landed.total <= budget;

  const all = runPipeline()
    .map((o) => ({ o, rel: relevance(o, criteria) }))
    .sort((a, b) => {
      if (searching && b.rel.score !== a.rel.score) return b.rel.score - a.rel.score;
      if (budget != null && withinBudget(a.o) !== withinBudget(b.o)) return withinBudget(a.o) ? -1 : 1;
      return 0;
    });
  const ranked = all.map((x) => x.o);

  const shown = (tab === "all" ? ranked : ranked.filter((o) => o.status === tab)).map((o) => ({
    o,
    rel: all.find((x) => x.o === o)!.rel,
  }));
  const flagged = ranked.filter((o) => o.status === "flagged");
  const count = (s: string) => (s === "all" ? ranked.length : ranked.filter((o) => o.status === s).length);

  return (
    <main className="page">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/" className="muted">← New search</Link>
        {" · "}
        <Link href={`/insider${qs(params)}`} className="muted">Edit insider details</Link>
        {" · "}
        <Link href={`/requirements${qs(params)}`} className="muted">Edit requirements</Link>
      </p>

      <div className="page-head">
        <div>
          <h1>{q ? <>Opportunities for &ldquo;{q}&rdquo;</> : "Opportunities"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Shipping to {destInfo.flag} {destInfo.label}{budget != null ? <>, budget {gbp(budget)}</> : null}{size ? <>, size {size}</> : null}.{" "}
            Flag rule: confidence ≥ {pct(RULES.flagConfidence)}, margin ≥ {pct(RULES.minMargin)}, expected profit ≥ {gbp(RULES.minExpectedProfit)}, ≥ {RULES.minComps} comps.
          </p>
          {searching && (
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Ranked against your insider details first — listings that don&apos;t match are still shown further down.
            </p>
          )}
        </div>
      </div>

      <section className="stats">
        <div className="stat"><div className="label">Scanned</div><div className="value num">{ranked.length}</div></div>
        <div className="stat"><div className="label">Identified</div><div className="value num">{ranked.filter((o) => o.match && !o.match.conflicts.length).length}</div></div>
        <div className="stat"><div className="label">Flagged</div><div className="value num" style={{ color: "var(--good)" }}>{flagged.length}</div></div>
        <div className="stat"><div className="label">Needs review</div><div className="value num" style={{ color: "var(--warn)" }}>{count("review")}</div></div>
        <div className="stat"><div className="label">Flagged upside</div><div className="value num">{gbp(flagged.reduce((s, o) => s + (o.expectedProfit ?? 0), 0))}</div></div>
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.id} href={`/results${qs(params, { tab: t.id === "all" ? undefined : t.id })}`} className={`tab ${tab === t.id ? "active" : ""}`}>
            {t.label} · {count(t.id)}
          </Link>
        ))}
      </nav>

      <div className="list">
        {shown.map(({ o, rel }) => {
          const l = o.listing;
          const ref = o.match ? refById(o.match.refId) : null;
          const src = SOURCE_COSTS[l.source];
          const ease = shippingEase(l.source, dest);
          return (
            <Link key={l.id} href={`/listing/${l.id}${qs(params)}`} className="row">
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
                {searching && rel.matched.length > 0 && (
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
                  <div className="small num" style={{ color: withinBudget(o) ? "var(--good)" : "var(--bad)" }}>
                    {withinBudget(o) ? "Within budget" : `Over by ${gbp(o.landed.total - budget)}`}
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
