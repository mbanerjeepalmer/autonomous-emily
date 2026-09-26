import { BRANDS } from "@/lib/data/references";
import { SearchForm } from "@/components/SearchForm";

export default function Search() {
  return (
    <main className="page page-narrow">
      <div className="hero">
        <h1>What are you looking for?</h1>
        <p className="muted">
          Name a designer, a specific piece, or just describe it. Next you can add insider details —
          then we&apos;ll scan the messy marketplaces for under-the-radar matches.
        </p>
        <SearchForm brands={BRANDS.map((b) => ({ id: b.id, name: b.name }))} />
      </div>
    </main>
  );
}
