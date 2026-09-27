import { SearchForm } from "@/components/SearchForm";

export default function Search() {
  return (
    <main className="landing">
      <span className="landing-eyebrow">Autono · Emily</span>
      <div className="landing-rule" />
      <h1>Hi, I&apos;m Emily.</h1>
      <p className="landing-sub">What are you searching for today?</p>
      <p className="small muted" style={{ margin: "-8px 0 0" }}>
        A short brief, then I send Grok Bot looking.
      </p>
      <SearchForm />
    </main>
  );
}
