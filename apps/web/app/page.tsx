import { SearchForm } from "@/components/SearchForm";

export default function Search() {
  return (
    <main className="landing">
      <span className="landing-eyebrow">Autono · Emily</span>
      <div className="landing-rule" />
      <h1>Hi, I&apos;m Emily.</h1>
      <p className="landing-sub">What are you searching for today?</p>
      <SearchForm />
    </main>
  );
}
