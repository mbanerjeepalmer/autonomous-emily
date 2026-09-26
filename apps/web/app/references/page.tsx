import { BRANDS, REFERENCES, brandById } from "@/lib/data/references";
import { NON_TARGET_BRANDS } from "@/lib/config";
import { COMPS } from "@/lib/data/comps";
import { ShoePhoto } from "@/components/ShoePhoto";

export default function References() {
  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Target universe</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            The known-good reference set every listing is matched against. {REFERENCES.length} models,{" "}
            {REFERENCES.reduce((s, r) => s + r.images.length, 0)} reference images, {COMPS.length} comps.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Brand variants used for OCR and text matching</h2>
        <table>
          <tbody>
            {BRANDS.map((b) => (
              <tr key={b.id}>
                <td style={{ width: 180, fontWeight: 600 }}>
                  {b.name}
                  {b.parent && <div className="small muted">line of {brandById(b.parent).name}</div>}
                </td>
                <td>
                  <div className="variants" style={{ marginTop: 0 }}>
                    {b.variants.map((v) => (
                      <span key={v} className="chip">{v}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 600, color: "var(--bad)" }}>Contradicting tags</td>
              <td>
                <div className="variants" style={{ marginTop: 0 }}>
                  {NON_TARGET_BRANDS.map((v) => (
                    <span key={v} className="chip">{v}</span>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="refgrid">
        {REFERENCES.map((r) => (
          <div key={r.id} className="card" style={{ marginTop: 0 }}>
            <div className="small muted">{brandById(r.brandId).name}</div>
            <h2 style={{ marginBottom: 2 }}>{r.model}</h2>
            <div className="small muted">{r.era} · {r.materials.join(", ")}</div>
            <div className="thumbs3">
              {r.images.map((img) => (
                <ShoePhoto key={img.id} sketch={img.sketch} kind={img.kind} uid={`ref-${img.id}`} />
              ))}
            </div>
            <h3>Distinguishing details</h3>
            <ul className="plain">
              {r.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <div className="variants">
              {r.keywords.map((k) => (
                <span key={k} className="chip src">{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
