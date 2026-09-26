"use client";

import Link from "next/link";
import { useBag } from "@/lib/clientState";

export function BagLink() {
  const bag = useBag();
  const count = bag.ready ? Object.keys(bag.ids).length : 0;
  return (
    <Link href="/bag">
      Bag{count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
