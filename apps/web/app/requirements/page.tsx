import Link from "next/link";
import { RequirementsForm } from "@/components/RequirementsForm";
import { StepHint } from "@/components/StepHint";
import { briefQueryString, type BriefParams } from "@/lib/briefParams";

export default async function Requirements({ searchParams }: { searchParams: Promise<BriefParams> }) {
  const params = await searchParams;
  const { q, brand, material, color, details, notes, budget, dest, size, requestId } = params;
  const backQs = briefQueryString(params, { tab: undefined });

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href={`/insider${backQs}`} className="muted">← Back to insider details</Link>
      </p>
      <div className="hero">
        <StepHint step={3} />
        <h1>What can we actually buy for you?</h1>
        <p className="muted">
          Budget, destination, and size change landed cost and ranking. Grok Bot is the sourcing agent for every brief.
        </p>
        <RequirementsForm
          hidden={{ q, brand, material, color, details, notes, requestId }}
          initial={{ budget, dest, size }}
        />
      </div>
    </main>
  );
}
