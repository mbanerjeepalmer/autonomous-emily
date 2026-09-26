import { NextResponse } from "next/server";
import { readAppSession } from "@/lib/auth";
import { markRunPending } from "@/lib/sources/store";

type InvokeBody = {
  task?: unknown;
  context?: unknown;
  requestId?: unknown;
};

function authorizeInvoke(request: Request): Promise<boolean> | boolean {
  const invokeSecret = process.env.EMILY_INVOKE_SECRET;
  if (invokeSecret) {
    const header = request.headers.get("authorization") || "";
    if (header === `Bearer ${invokeSecret}`) {
      return true;
    }
  }
  return readAppSession();
}

export async function POST(request: Request) {
  if (!(await authorizeInvoke(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.GROK_BOT_WEBHOOK_URL;
  const webhookKey = process.env.GROK_BOT_WEBHOOK_KEY;
  if (!webhookUrl || !webhookKey) {
    return NextResponse.json(
      { error: "GROK_BOT_WEBHOOK_URL / GROK_BOT_WEBHOOK_KEY not configured" },
      { status: 500 },
    );
  }

  let body: InvokeBody;
  try {
    body = (await request.json()) as InvokeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const task = typeof body.task === "string" ? body.task.trim() : "";
  if (!task) {
    return NextResponse.json({ error: "task is required" }, { status: 400 });
  }

  const requestId =
    typeof body.requestId === "string" && body.requestId.trim()
      ? body.requestId.trim()
      : crypto.randomUUID();

  const payload = {
    task,
    context: body.context ?? null,
    requestId,
    source: "autonoemily.world",
  };

  let upstream: Response;
  try {
    upstream = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${webhookKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook request failed";
    return NextResponse.json({ error: message, requestId }, { status: 502 });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        status: upstream.status,
        requestId,
        error: detail || `Webhook returned ${upstream.status}`,
      },
      { status: 502 },
    );
  }

  await markRunPending(requestId);

  return NextResponse.json({
    ok: true,
    status: upstream.status,
    requestId,
  });
}
