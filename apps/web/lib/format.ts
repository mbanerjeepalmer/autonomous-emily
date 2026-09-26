import type { Money } from "./types.ts";

const SYMBOL = { GBP: "£", USD: "$", EUR: "€", JPY: "¥" } as const;

export const gbp = (n: number) => `${n < -0.5 ? "−" : ""}£${Math.abs(Math.round(n)).toLocaleString("en-GB")}`;
export const money = (m: Money) => `${SYMBOL[m.currency]}${m.amount.toLocaleString("en-GB")}`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const confColor = (c: number) => (c >= 0.8 ? "var(--good)" : c >= 0.55 ? "var(--warn)" : "var(--bad)");
