import { NextResponse } from "next/server";
import {
  buildDesktopViewerUrl,
  createDesktopToken,
  readAppSession,
} from "@/lib/auth";

export async function POST() {
  if (!(await readAppSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await createDesktopToken();
    const url = buildDesktopViewerUrl(token);
    return NextResponse.json({
      token,
      url,
      expiresInSeconds: 3600,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
