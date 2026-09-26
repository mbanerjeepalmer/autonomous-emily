import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grail Finder",
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
            <Link href="/">Opportunities</Link>
            <Link href="/references">Target universe</Link>
            <Link href="/api/opportunities">API</Link>
          </nav>
          <span className="proto">Prototype · hard-coded data</span>
        </header>
        {children}
      </body>
    </html>
  );
}
