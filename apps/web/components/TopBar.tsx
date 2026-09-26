"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagLink } from "@/components/BagLink";

export function TopBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        AUTONO<span>·</span>EMILY
      </Link>
      <nav className="nav">
        <Link href="/">Search</Link>
        <Link href="/results">Browse all</Link>
        <Link href="/references">Target universe</Link>
        <Link href="/invoke">Invoke</Link>
        <Link href="/desktop">Desktop</Link>
        <Link href="/api/opportunities">API</Link>
        <BagLink />
      </nav>
      <span className="proto">Prototype · hard-coded data</span>
    </header>
  );
}
