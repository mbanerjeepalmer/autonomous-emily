export type DiscoveryFinding = {
  title: string;
  url: string;
  source?: string;
  price?: string;
  snippet?: string;
};

export type DiscoveryBrief = {
  query: string;
  brand?: string;
  material?: string;
  color?: string;
  details?: string;
  notes?: string;
  budget?: number;
  destination?: string;
  size?: string;
};

/** Shared prompt for Grok Bot invoke and the Pi discovery agent. */
export function briefToPrompt(brief: DiscoveryBrief): string {
  const lines = [`Looking for: ${brief.query}`];
  if (brief.brand) lines.push(`Brand spellings/variants: ${brief.brand}`);
  if (brief.material) lines.push(`Material: ${brief.material}`);
  if (brief.color) lines.push(`Colour: ${brief.color}`);
  if (brief.details) lines.push(`Distinguishing details: ${brief.details}`);
  if (brief.notes) lines.push(`Insider tip from the buyer: ${brief.notes}`);
  if (brief.size) lines.push(`Size: ${brief.size}`);
  if (brief.budget) lines.push(`Budget (landed, GBP): ${brief.budget}`);
  if (brief.destination) lines.push(`Ships to: ${brief.destination}`);
  return lines.join("\n");
}
