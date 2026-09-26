import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createAppSession,
} from "@/lib/auth";

export async function POST(request: Request) {
  const expected = process.env.APP_GATE_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "APP_GATE_PASSWORD is not configured" },
      { status: 500 },
    );
  }

  let password = "";
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string };
    password = body.password || "";
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
  }

  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createAppSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
