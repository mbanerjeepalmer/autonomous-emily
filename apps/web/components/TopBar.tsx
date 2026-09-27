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
        <Link href="/results">All findings</Link>
        <Link href="/references">Targets</Link>
        <BagLink />
        <span className="nav-ops">
          <Link href="/invoke">Invoke</Link>
          <Link href="/desktop">Desktop</Link>
        </span>
      </nav>
        <span className="proto">Prototype · live agents</span>
    </header>
  );
}
