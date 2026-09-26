import Link from "next/link";
import { RequirementsForm } from "@/components/RequirementsForm";
import { parseAgent } from "@/lib/agent/provider";

type Params = {
  q?: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  notes?: string;
  budget?: string;
  dest?: string;
  size?: string;
  agent?: string;
};

export default async function Requirements({ searchParams }: { searchParams: Promise<Params> }) {
  const { q, brand, material, color, details, notes, budget, dest, size, agent } = await searchParams;
  const selectedAgent = parseAgent(agent);
  const backQs = (() => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, brand, material, color, details, notes, agent: selectedAgent })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  })();

  return (
    <main className="page page-narrow">
      <p className="small" style={{ margin: "0 0 12px" }}>
        <Link href={`/insider${backQs}`} className="muted">← Back to insider details</Link>
      </p>
      <div className="hero">
        <h1>What can we actually buy for you?</h1>
        <p className="muted">
          The last few things the agent needs before it goes shopping on your behalf: how much you&apos;ll spend,
          where it has to ship, and what sizes are actually wearable by you.
        </p>
        <RequirementsForm
          hidden={{ q, brand, material, color, details, notes }}
          initial={{ budget, dest, size }}
          agent={selectedAgent}
        />
      </div>
    </main>
  );
}
