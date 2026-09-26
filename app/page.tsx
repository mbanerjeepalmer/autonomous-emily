import Link from "next/link";
import { readAppSession } from "@/lib/auth";

export default async function HomePage() {
  const signedIn = await readAppSession();

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <p
        style={{
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
          fontSize: "0.8rem",
          marginBottom: "0.75rem",
        }}
      >
        Autonomous Emily
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          lineHeight: 1.1,
          margin: "0 0 1rem",
          fontWeight: 650,
        }}
      >
        Grok Bot control surface
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "1.1rem", maxWidth: 540 }}>
        The Next.js app on Vercel issues short-lived desktop tokens. The Hetzner
        box runs the real Grok Bot Electron client behind Caddy + noVNC.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem" }}>
        <Link
          href="/desktop"
          style={{
            display: "inline-block",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            padding: "0.75rem 1.1rem",
            borderRadius: 8,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {signedIn ? "Open desktop" : "Sign in & open desktop"}
        </Link>
      </div>
    </main>
  );
}
