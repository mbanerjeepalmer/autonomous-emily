import Link from "next/link";
import { runPipeline } from "@/lib/pipeline";
import { hydrateRunFindings, refreshFindings } from "@/lib/sources/store";
import { RULES } from "@/lib/config";
import { gbp, pct } from "@/lib/format";
import { DESTINATIONS, DEFAULT_DESTINATION, isDestinationId } from "@/lib/destinations";
import { relevance, hasCriteria, type SearchCriteria } from "@/lib/relevance";
import { briefQueryString, type BriefParams } from "@/lib/briefParams";
import { OpportunityRow } from "@/components/OpportunityRow";
import { RefineBar } from "@/components/RefineBar";
import { AgentRun } from "@/components/AgentRun";
import { StepHint } from "@/components/StepHint";
import { readAppSession } from "@/lib/auth";
import type { Opportunity } from "@/lib/types";

const TABS = [
  { id: "all", label: "All" },
  { id: "flagged", label: "Flagged" },
  { id: "review", label: "Needs review" },
  { id: "pass", label: "Passed" },
  { id: "no-match", label: "No match" },
] as const;

function splitDetailTerms(details?: string): string[] {
  if (!details) return [];
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of details.split(/[,\n/]/)) {
    const term = raw.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

function withoutTerm(details: string | undefined, term: string): string | undefined {
  const remaining = splitDetailTerms(details).filter((t) => t.toLowerCase() !== term.toLowerCase());
  return remaining.length ? remaining.join(", ") : undefined;
}

function emptyCopy(opts: {
  searching: boolean;
  signedIn: boolean;
  scoped: boolean;
  runStatus?: string | null;
}): string {
  if (opts.runStatus === "empty") {
    return "Grok Bot finished with no usable listings for this brief.";
  }
  if (opts.scoped && opts.runStatus === "pending") {
    return "No listings for this run yet — Emily is still searching.";
  }
  if (opts.searching && !opts.signedIn) {
    return "Sign in above to send this brief to Emily. The list stays empty until Grok Bot submits findings.";
  }
  if (opts.searching) {
    return "No live listings yet for this brief — Emily is searching, or nothing usable came back.";
  }
  return "No live listings yet. Start a search and Emily will send Grok Bot out.";
}

// Findings are submitted at runtime and must not become a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Results({ searchParams }: { searchParams: Promise<BriefParams> }) {
  const params = await searchParams;
  await refreshFindings();
  const run = params.requestId ? await hydrateRunFindings(params.requestId) : null;
  const signedIn = await readAppSession();
  const { tab = "all", q, brand, material, color, details, notes, size } = params;
  const dest = isDestinationId(params.dest) ? params.dest : DEFAULT_DESTINATION;
  const destInfo = DESTINATIONS.find((d) => d.id === dest)!;
  const budget = params.budget && Number.isFinite(Number(params.budget)) ? Number(params.budget) : undefined;

  const criteria: SearchCriteria = { q, brand, material, color, details, size };
  const searching = hasCriteria(criteria);
  const showAgent = searching || Boolean(params.requestId);
  const withinBudget = (o: Opportunity) => budget == null || o.landed.total <= budget;

  const scopedIds = params.requestId ? new Set(run?.findingIds ?? []) : null;
  const all = runPipeline(dest)
    .filter((o) => !scopedIds || scopedIds.has(o.listing.id))
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
  const qs = (overrides: Partial<BriefParams> = {}) => briefQueryString(params, overrides);

  return (
    <main className="page page-refine">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/" className="muted">← New search</Link>
        {" · "}
        <Link href={`/insider${qs({ tab: undefined })}`} className="muted">Edit insider details</Link>
        {" · "}
        <Link href={`/requirements${qs({ tab: undefined })}`} className="muted">Edit requirements</Link>
      </p>

      <div className="page-head">
        <div>
          <StepHint step={4} />
          <h1>{q ? <>Opportunities for &ldquo;{q}&rdquo;</> : "Opportunities"}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Shipping to {destInfo.flag} {destInfo.label}{budget != null ? <>, budget {gbp(budget)}</> : null}{size ? <>, size {size}</> : null}.{" "}
            Flag rule: confidence ≥ {pct(RULES.flagConfidence)}, margin ≥ {pct(RULES.minMargin)}, expected profit ≥ {gbp(RULES.minExpectedProfit)}, ≥ {RULES.minComps} comps.
          </p>
          {params.requestId ? (
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Showing listings from this run only.
              {" · "}
              <Link href={`/results${qs({ requestId: undefined, tab: undefined })}`} className="muted">See all findings</Link>
            </p>
          ) : searching ? (
            <p className="muted small" style={{ margin: "6px 0 0" }}>
              Ranked against your insider details first — listings that don&apos;t match are still shown further down.
            </p>
          ) : null}
        </div>
      </div>

      <section className="stats">
        <div className="stat"><div className="label">Scanned</div><div className="value num">{ranked.length}</div></div>
        <div className="stat"><div className="label">Identified</div><div className="value num">{ranked.filter((o) => o.match && !o.match.conflicts.length).length}</div></div>
        <div className="stat"><div className="label">Flagged</div><div className="value num" style={{ color: "var(--good)" }}>{flagged.length}</div></div>
        <div className="stat"><div className="label">Needs review</div><div className="value num" style={{ color: "var(--warn)" }}>{count("review")}</div></div>
        <div className="stat"><div className="label">Flagged upside</div><div className="value num">{gbp(flagged.reduce((s, o) => s + (o.expectedProfit ?? 0), 0))}</div></div>
      </section>

      {showAgent && (
        <AgentRun
          initiallySignedIn={signedIn}
          queryString={qs().replace(/^\?/, "")}
          requestId={params.requestId}
          brief={{
            query: q || [brand, material, color, details].filter(Boolean).join(" "),
            brand, material, color, details, notes, budget, destination: destInfo.label, size,
          }}
        />
      )}

      {splitDetailTerms(details).length > 0 && (
        <div className="direction-chips">
          <span className="small muted">Refining toward:</span>
          {splitDetailTerms(details).map((term) => (
            <Link key={term} href={`/results${qs({ details: withoutTerm(details, term) })}`} className="chip pick">
              {term} ✕
            </Link>
          ))}
          <Link href={`/results${qs({ details: undefined })}`} className="small muted" style={{ marginLeft: 4 }}>
            Clear direction
          </Link>
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <Link key={t.id} href={`/results${qs({ tab: t.id === "all" ? undefined : t.id })}`} className={`tab ${tab === t.id ? "active" : ""}`}>
            {t.label} · {count(t.id)}
          </Link>
        ))}
      </nav>

      <div className="list">
        {shown.map(({ o, rel }) => (
          <OpportunityRow
            key={o.listing.id}
            o={o}
            href={`/listing/${encodeURIComponent(o.listing.id)}${qs()}`}
            dest={dest}
            rel={rel}
            searching={searching}
            budget={budget}
          />
        ))}
        {!shown.length && (
          <p className="muted">
            {emptyCopy({
              searching,
              signedIn,
              scoped: Boolean(params.requestId),
              runStatus: run?.status,
            })}
          </p>
        )}
      </div>

      <RefineBar opportunities={ranked} />
    </main>
  );
}
