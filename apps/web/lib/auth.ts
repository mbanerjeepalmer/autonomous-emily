import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "ae_session";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

function secretKey(name: string): Uint8Array {
  return new TextEncoder().encode(requireEnv(name));
}

export async function createAppSession(): Promise<string> {
  return new SignJWT({ role: "operator" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("operator")
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey("SESSION_SECRET"));
}

export async function readAppSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey("SESSION_SECRET"));
    return true;
  } catch {
    return false;
  }
}

export { SESSION_COOKIE };

export async function createDesktopToken(sub = "operator"): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setAudience("desktop")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secretKey("DESKTOP_JWT_SECRET"));
}

export function desktopPublicOrigin(): string {
  const host = requireEnv("DESKTOP_PUBLIC_HOST").replace(/^https?:\/\//, "");
  return `https://${host}`;
}

export function buildDesktopViewerUrl(token: string): string {
  const origin = desktopPublicOrigin();
  // /enter sets an HttpOnly cookie then redirects to vnc.html so CSS/JS/WebSocket
  // requests authenticate without needing ?token= on every asset.
  const params = new URLSearchParams({
    token,
    autoconnect: "1",
    resize: "remote",
  });
  return `${origin}/enter?${params.toString()}`;
}
