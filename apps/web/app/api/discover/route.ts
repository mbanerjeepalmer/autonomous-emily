import { NextResponse } from "next/server";
import { runDiscoveryAgent, type DiscoveryBrief } from "@/lib/agent/discoveryAgent";

export async function POST(req: Request) {
  let body: Partial<DiscoveryBrief>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.query || typeof body.query !== "string") {
    return NextResponse.json({ ok: false, error: "\"query\" is required" }, { status: 400 });
  }

  try {
    const findings = await runDiscoveryAgent(body as DiscoveryBrief);
    return NextResponse.json({ ok: true, findings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery agent failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
