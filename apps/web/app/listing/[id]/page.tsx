import Link from "next/link";
import { notFound } from "next/navigation";
import { getOpportunity, runPipeline } from "@/lib/pipeline";
import { ensureStoreHydrated } from "@/lib/sources/store";
import { brandById, refById, refImageById } from "@/lib/data/references";
import { SOURCE_COSTS } from "@/lib/config";
import { normaliseText } from "@/lib/fuzzy";
import { gbp, money, pct } from "@/lib/format";
import { DEFAULT_DESTINATION, DESTINATIONS, EASE_TONE, isDestinationId, shippingEase } from "@/lib/destinations";
import { ShoePhoto } from "@/components/ShoePhoto";
import { Confidence } from "@/components/Confidence";
import { DecisionPanel } from "@/components/Decision";

export function generateStaticParams() {
  return runPipeline().map((o) => ({ id: o.listing.id }));
}

// Bot-supplied listing ids do not exist at build time.
export const dynamic = "force-dynamic";

const COMP_SOURCE = { grailed: "Grailed", ebay_sold: "eBay sold", stockx: "StockX", auction: "Auction" } as const;

function Highlight({ text, match }: { text: string; match: string }) {
  const i = text.indexOf(match);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{match}</mark>
      {text.slice(i + match.length)}
    </>
  );
}

type SearchParams = Record<string, string | undefined>;

export default async function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await ensureStoreHydrated();
  const { id } = await params;
  const sp = await searchParams;
  const o = getOpportunity(id);
  if (!o) notFound();
  const l = o.listing;
  const m = o.match;
  const ref = m ? refById(m.refId) : null;
  const src = SOURCE_COSTS[l.source];
  const dest = isDestinationId(sp.dest) ? sp.dest : DEFAULT_DESTINATION;
  const destInfo = DESTINATIONS.find((d) => d.id === dest)!;
  const ease = shippingEase(l.source, dest);
  const backQs = (() => {
    const qp = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v) qp.set(k, v);
    const s = qp.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <main className="page">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href={`/results${backQs}`} className="muted">← Opportunities</Link>
      </p>

      <div className="detail">
        <div>
          <div className="card">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <span className={`badge ${o.status}`}>{o.status.replace("-", " ")}</span>
              <span className="chip src">{src.flag} · {src.label}</span>
              <span className="muted small">Posted {l.postedAt} · {l.location}</span>
            </div>
            <h1 style={{ fontSize: 22 }}>{l.title}</h1>
            {l.titleGloss && <p className="muted" style={{ margin: "4px 0 0" }}>“{l.titleGloss}”</p>}
            <p style={{ margin: "10px 0 0" }}>{l.description}</p>
            <div className="meta" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="chip">Asking {money(l.price)}</span>
              {l.size && <span className="chip">Size {l.size}</span>}
              <span className="chip">{l.condition}</span>
            </div>
          </div>

          <div className="card">
            <h2>Listing photos</h2>
            <div className="gallery">
              {l.photos.map((p) => (
                <figure key={p.id} style={{ margin: 0 }}>
                  <ShoePhoto sketch={p.sketch} kind={p.kind} uid={`g-${p.id}`} />
                  <figcaption className="small muted">{p.kind}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          {m && ref ? (
            <>
              <div className="card">
                <h2>Visual match — listing vs reference</h2>
                {l.photos.map((p) => {
                  const best = m.visual.filter((v) => v.photoId === p.id).sort((a, b) => b.similarity - a.similarity)[0];
                  const refImg = best ? refImageById(best.refImageId) : null;
                  return (
                    <div className="pair" key={p.id}>
                      <figure>
                        <ShoePhoto sketch={p.sketch} kind={p.kind} uid={`l-${p.id}`} />
                        <figcaption>Listing · {p.kind}</figcaption>
                      </figure>
                      <div className="sim">
                        {best ? (
                          <>
                            <div className="pct num" style={{ color: best.similarity >= 0.82 ? "var(--good)" : "var(--warn)" }}>{pct(best.similarity)}</div>
                            <div className="small muted">cosine</div>
                          </>
                        ) : (
                          <div className="small muted">—</div>
                        )}
                      </div>
                      <figure>
                        {refImg ? (
                          <>
                            <ShoePhoto sketch={refImg.sketch} kind={refImg.kind} uid={`r-${p.id}`} />
                            <figcaption>Reference · {refImg.caption}</figcaption>
                          </>
                        ) : (
                          <div className="small muted">No reference image of this type</div>
                        )}
                      </figure>
                    </div>
                  );
                })}
              </div>

              <div className="card">
                <h2>Evidence</h2>
                <ul className="evidence">
                  <li>
                    <span className={`dot ${m.visualScore >= 0.6 ? "good" : m.visualScore >= 0.3 ? "warn" : "bad"}`} />
                    <span>
                      Best visual similarity <strong>{pct(m.bestSimilarity)}</strong>
                      {m.supportingKinds.length ? <> — strong on {m.supportingKinds.join(", ")}</> : null}
                    </span>
                  </li>
                  {l.photos.filter((p) => p.ocrText).map((p) => {
                    const hit = m.ocr.find((x) => x.photoId === p.id);
                    const norm = normaliseText(p.ocrText!, true);
                    return (
                      <li key={p.id}>
                        <span className={`dot ${hit ? "good" : m.conflicts.length ? "bad" : "warn"}`} />
                        <span>
                          OCR on {p.kind}: <span className="mono">“{p.ocrText}”</span>
                          <br />
                          <span className="small muted">
                            normalised <span className="mono">{hit ? <Highlight text={norm} match={hit.matchedText} /> : norm}</span>
                            {hit ? <> → {brandById(hit.brandId).name} via “{hit.variant}” ({pct(hit.score)} fuzzy)</> : <> → no target brand</>}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                  {m.text.filter((t, i, all) => all.findIndex((x) => x.term === t.term) === i).map((t, i) => (
                    <li key={i}>
                      <span className="dot warn" />
                      <span>
                        Seller {t.field} mentions <strong>{t.term}</strong> <span className="muted small">({t.level} keyword — weak signal)</span>
                      </span>
                    </li>
                  ))}
                  {m.conflicts.map((c) => (
                    <li key={c}>
                      <span className="dot bad" />
                      <strong>{c}</strong>
                    </li>
                  ))}
                  {m.notes.map((n) => (
                    <li key={n}>
                      <span className="dot warn" />
                      <span className="muted">{n}</span>
                    </li>
                  ))}
                </ul>

                {o.candidates.length > 1 && (
                  <>
                    <h3 style={{ margin: "18px 0 6px" }}>Other candidates</h3>
                    <table>
                      <tbody>
                        {o.candidates.slice(1, 4).map((c) => (
                          <tr key={c.refId}>
                            <td>{brandById(c.brandId).name} — {refById(c.refId).model}</td>
                            <td className="r num muted">{pct(c.bestSimilarity)} visual</td>
                            <td className="r num">{pct(c.confidence)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>

              {o.valuation && (
                <div className="card">
                  <h2>Comparable sales</h2>
                  <p className="small muted" style={{ marginTop: -6 }}>
                    Adjusted to this listing&apos;s condition ({l.condition}); newer sales weigh more (120-day half-life).
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Sold</th>
                        <th>Source</th>
                        <th>Item</th>
                        <th>Cond.</th>
                        <th className="r">Price</th>
                        <th className="r">Adj. £</th>
                        <th className="r">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.valuation.comps.map((c) => (
                        <tr key={c.id}>
                          <td className="num">{c.soldAt}</td>
                          <td>{COMP_SOURCE[c.source]}</td>
                          <td>{c.title}</td>
                          <td>{c.condition}</td>
                          <td className="r num">{money(c.price)}</td>
                          <td className="r num">{gbp(c.normalisedGbp)}</td>
                          <td className="r num muted">{c.weight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <h2>No match</h2>
              <p className="muted" style={{ margin: 0 }}>
                None of the listing photos came close to a reference image, and no target brand was read on a tag.
              </p>
            </div>
          )}
        </div>

        <aside className="side">
          <div className="card">
            <h2>Opportunity</h2>
            {m && <Confidence value={m.confidence} label="Match confidence" />}
            {o.valuation && (
              <div style={{ margin: "14px 0" }}>
                <div className="small muted">Estimated value</div>
                <div style={{ fontSize: 28, fontWeight: 700 }} className="num">{gbp(o.valuation.estimate)}</div>
                <div className="small muted num">range {gbp(o.valuation.low)} – {gbp(o.valuation.high)} · {o.valuation.comps.length} comps</div>
              </div>
            )}
            <div className={`ease ${EASE_TONE[ease.level]}`} style={{ margin: "4px 0 14px" }}>
              <span className="dot" /> {ease.label} shipping to {destInfo.flag} {destInfo.label} · {ease.days}
              <div className="small muted" style={{ marginTop: 2 }}>{ease.note}</div>
            </div>
            <div className="kv num" style={{ marginTop: 12 }}>
              {o.landed.lines.map((line) => (
                <div key={line.label} style={{ display: "contents" }}>
                  <span className="muted">{line.label}</span>
                  <span>{gbp(line.gbp)}</span>
                </div>
              ))}
              <span className="total">Landed in London</span>
              <span className="total">{gbp(o.landed.total)}</span>
              {o.margin != null && (
                <>
                  <span className="muted">Margin if genuine</span>
                  <span style={{ color: o.margin > 0 ? "var(--good)" : "var(--bad)" }}>{pct(o.margin)}</span>
                </>
              )}
              {o.expectedProfit != null && (
                <>
                  <span className="muted">Expected profit (conf.-weighted)</span>
                  <strong style={{ color: o.expectedProfit > 0 ? "var(--good)" : "var(--bad)" }}>{gbp(o.expectedProfit)}</strong>
                </>
              )}
            </div>
            <ul className="plain small" style={{ marginTop: 14 }}>
              {o.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <DecisionPanel id={l.id} url={l.url} />

          {ref && (
            <div className="card">
              <h2>Reference: {brandById(ref.brandId).name}</h2>
              <div style={{ fontWeight: 600 }}>{ref.model}</div>
              <div className="small muted">{ref.era}</div>
              <div className="small" style={{ marginTop: 8 }}>{ref.materials.join(" · ")}</div>
              <ul className="plain">
                {ref.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
