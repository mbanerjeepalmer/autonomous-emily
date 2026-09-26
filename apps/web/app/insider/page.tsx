import Link from "next/link";
import { suggestHints } from "@/lib/suggest";
import { InsiderForm } from "@/components/InsiderForm";

type Params = { q?: string; brand?: string; material?: string; color?: string; details?: string; notes?: string; };

export default async function Insider({ searchParams }: { searchParams: Promise<Params> }) {
  const { q = "", brand, material, color, details, notes } = await searchParams;
  const s = suggestHints(q);

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/" className="muted">← Back to search</Link>
      </p>
      <div className="hero">
        <h1>Give us the insider information</h1>
        <p className="muted">
          {q ? (
            <>Searching for <strong>“{q}”</strong>. </>
          ) : null}
          Anything you know that a casual seller wouldn&apos;t — a fabric, a colourway, a tag misspelling — helps us
          surface the listing that&apos;s mislabelled or badly photographed instead of the obvious one everyone else already found.
        </p>
        {s.matchedBrandNames.length > 0 && (
          <p className="small muted">Looks like: {s.matchedBrandNames.join(", ")} — chips below are pre-filled from our reference set.</p>
        )}
        <InsiderForm
          q={q}
          variantChips={s.variantChips}
          materialChips={s.materialChips}
          detailChips={s.detailChips}
          keywordChips={s.keywordChips}
          colorChips={s.colorChips}
          initial={{ brand, material, color, details, notes }}
        />
      </div>
    </main>
  );
}
