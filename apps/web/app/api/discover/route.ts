import { NextResponse } from "next/server";
import { readAppSession } from "@/lib/auth";
import { runDiscoveryAgent, type DiscoveryBrief } from "@/lib/agent/discoveryAgent";
import { listingFromLooseFinding } from "@/lib/sources/findings";
import { upsertFindings } from "@/lib/sources/store";

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function briefFromBody(body: unknown): DiscoveryBrief | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "Invalid JSON body" };
  const record = body as Record<string, unknown>;
  const query = asTrimmedString(record.query);
  if (!query) return { error: "query is required" };

  const budget = typeof record.budget === "number" && Number.isFinite(record.budget)
    ? record.budget
    : undefined;

  return {
    query,
    brand: asTrimmedString(record.brand),
    material: asTrimmedString(record.material),
    color: asTrimmedString(record.color),
    details: asTrimmedString(record.details),
    notes: asTrimmedString(record.notes),
    size: asTrimmedString(record.size),
    destination: asTrimmedString(record.destination),
    budget,
  };
}

export async function POST(request: Request) {
  if (!(await readAppSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const brief = briefFromBody(body);
  if ("error" in brief) {
    return NextResponse.json({ error: brief.error }, { status: 400 });
  }

  const requestId = crypto.randomUUID();

  try {
    const findings = await runDiscoveryAgent(brief);
    const listings = findings.flatMap((finding) => {
      try {
        return [listingFromLooseFinding(finding)];
      } catch {
        return [];
      }
    });
    const run = await upsertFindings(requestId, listings);
    return NextResponse.json({
      ok: true,
      requestId,
      findings,
      status: run.status,
      findingIds: run.findingIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery agent failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
