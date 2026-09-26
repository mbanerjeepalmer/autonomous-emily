import { NextResponse } from "next/server";
import { readAppSession } from "@/lib/auth";
import { authorizeMcp } from "@/lib/mcp-auth";
import { getRun } from "@/lib/sources/store";

async function authorizeRuns(request: Request): Promise<boolean> {
  if (authorizeMcp(request)) {
    return true;
  }
  return readAppSession();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  if (!(await authorizeRuns(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId: rawId } = await context.params;
  const requestId = decodeURIComponent(rawId || "").trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const run = await getRun(requestId);
  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    requestId: run.requestId,
    status: run.status,
    findingCount: run.findingIds.length,
    findingIds: run.findingIds,
  });
}
