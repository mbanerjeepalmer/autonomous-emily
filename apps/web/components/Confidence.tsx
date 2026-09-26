import { confColor, pct } from "@/lib/format";

export function Confidence({ value, label = "Confidence" }: { value: number; label?: string }) {
  return (
    <div className="conf">
      <div className="top">
        <span className="muted">{label}</span>
        <strong className="num" style={{ color: confColor(value) }}>{pct(value)}</strong>
      </div>
      <div className="meter">
        <div style={{ width: pct(value), background: confColor(value) }} />
      </div>
    </div>
  );
}
