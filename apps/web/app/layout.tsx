import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emily",
  description: "Finds under-catalogued Japanese designer footwear across messy marketplaces.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            GRAIL<span>/</span>FINDER
          </Link>
          <nav className="nav">
            <Link href="/">Search</Link>
            <Link href="/results">Browse all</Link>
            <Link href="/references">Target universe</Link>
            <Link href="/invoke">Invoke</Link>
            <Link href="/desktop">Desktop</Link>
            <Link href="/api/opportunities">API</Link>
          </nav>
          <span className="proto">Prototype · hard-coded data</span>
        </header>
        {children}
      </body>
    </html>
  );
}
