import Link from "next/link";
import { suggestHints } from "@/lib/suggest";
import { filenameToQuery } from "@/lib/searchQuery";
import type { BriefParams } from "@/lib/briefParams";
import { InsiderForm } from "@/components/InsiderForm";
import { StepHint } from "@/components/StepHint";

export default async function Insider({ searchParams }: { searchParams: Promise<BriefParams> }) {
  const params = await searchParams;
  const q = params.q?.trim() || filenameToQuery(params.image);
  const s = suggestHints(q);
  const photoNote = params.image
    ? `Buyer attached a photo named “${params.image}” (pixels are not analyzed yet).`
    : undefined;
  const brand = params.brand || (s.matchedBrandNames.length ? s.matchedBrandNames.join(", ") : undefined);
  const notes = params.notes || photoNote;

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href="/" className="muted">← Back to search</Link>
      </p>
      <div className="hero">
        <StepHint step={2} />
        <h1>Give us the insider information</h1>
        <p className="muted">
          {q ? (
            <>Searching for <strong>“{q}”</strong>. </>
          ) : null}
          Anything you know that a casual seller wouldn&apos;t — a fabric, a colourway, a tag misspelling — helps us
          surface the listing that&apos;s mislabelled or badly photographed instead of the obvious one everyone else already found.
        </p>
        {s.matchedBrandNames.length > 0 && (
          <p className="small muted">Looks like: {s.matchedBrandNames.join(", ")} — brand and chips are filled from our reference set. Edit anything that&apos;s wrong.</p>
        )}
        <InsiderForm
          q={q}
          variantChips={s.variantChips}
          materialChips={s.materialChips}
          detailChips={s.detailChips}
          keywordChips={s.keywordChips}
          colorChips={s.colorChips}
          initial={{ brand, material: params.material, color: params.color, details: params.details, notes }}
          carry={{ dest: params.dest, budget: params.budget, size: params.size, requestId: params.requestId }}
        />
      </div>
    </main>
  );
}
