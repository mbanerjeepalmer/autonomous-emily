/** Query-string fields carried through the four-step brief. */
export type BriefParams = {
  tab?: string;
  q?: string;
  dest?: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  notes?: string;
  budget?: string;
  size?: string;
  requestId?: string;
  image?: string;
};

export function briefQueryString(
  params: BriefParams,
  overrides: Partial<BriefParams> = {},
): string {
  const merged = { ...params, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
