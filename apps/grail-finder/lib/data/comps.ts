// 4. COMPARABLE SALES — recent sold prices from efficient marketplaces.
// Illustrative numbers only. Real app: Grailed sold, eBay sold (Marketplace
// Insights), StockX, auction results — keyed by reference item.

import type { Comp } from "../types.ts";

type Row = [refId: string, source: Comp["source"], title: string, amount: number, currency: Comp["price"]["currency"], soldAt: string, condition: Comp["condition"]];

const ROWS: Row[] = [
  ["visvim-fbt", "grailed", "Visvim FBT Lhamo Folk – brown suede 9", 520, "USD", "2026-08-30", "used"],
  ["visvim-fbt", "grailed", "Visvim FBT Shaman – sand 9.5", 610, "USD", "2026-07-18", "like-new"],
  ["visvim-fbt", "ebay_sold", "visvim FBT elk suede moccasin US9", 455, "USD", "2026-09-10", "used"],
  ["visvim-fbt", "ebay_sold", "VISVIM FBT brown 26cm", 380, "GBP", "2026-06-02", "used"],
  ["visvim-fbt", "auction", "visvim FBT, early colourway, 27cm", 72000, "JPY", "2026-05-14", "worn"],

  ["yohji-sidezip", "grailed", "Yohji Yamamoto Pour Homme side zip boots sz 3", 420, "USD", "2026-09-02", "used"],
  ["yohji-sidezip", "grailed", "Yohji PH archive zip boot black", 380, "USD", "2026-07-11", "worn"],
  ["yohji-sidezip", "ebay_sold", "Yohji Yamamoto leather side-zip boots 27", 330, "GBP", "2026-08-21", "used"],
  ["yohji-sidezip", "auction", "Yohji Yamamoto Pour Homme boots, c. 2000", 58000, "JPY", "2026-04-20", "used"],

  ["y3-qasa", "stockx", "Y-3 Qasa High Black/White", 210, "USD", "2026-09-15", "new"],
  ["y3-qasa", "grailed", "Y-3 Qasa High US 9", 175, "USD", "2026-08-01", "used"],
  ["y3-qasa", "ebay_sold", "adidas Y-3 Qasa High black", 150, "GBP", "2026-09-04", "like-new"],
  ["y3-qasa", "ebay_sold", "Y3 Qasa high top trainers UK8", 120, "GBP", "2026-06-25", "used"],

  ["undercover-gyakusou", "stockx", "Nike Gyakusou running shoe", 150, "USD", "2026-09-12", "new"],
  ["undercover-gyakusou", "grailed", "Nike x Undercover Gyakusou US 9", 115, "USD", "2026-08-08", "used"],
  ["undercover-gyakusou", "ebay_sold", "Gyakusou Nike trainers olive", 85, "GBP", "2026-07-29", "used"],

  ["kapital-sashiko", "grailed", "Kapital sashiko patchwork sneakers 43", 330, "USD", "2026-09-06", "used"],
  ["kapital-sashiko", "grailed", "Kapital boro sneakers indigo", 360, "USD", "2026-08-12", "like-new"],
  ["kapital-sashiko", "ebay_sold", "KAPITAL patchwork sneaker EU42", 240, "GBP", "2026-07-03", "used"],
  ["kapital-sashiko", "auction", "Kapital sashiko sneakers 27cm", 38000, "JPY", "2026-05-30", "used"],

  ["cdg-derby", "grailed", "Comme des Garcons Homme Plus derby 26", 290, "USD", "2026-08-25", "used"],
  ["cdg-derby", "ebay_sold", "CDG Homme Plus leather shoes black", 210, "GBP", "2026-09-01", "used"],
  ["cdg-derby", "grailed", "CDG Homme Plus 90s derby", 240, "USD", "2026-06-09", "worn"],
  ["cdg-derby", "auction", "Comme des Garçons Homme Plus shoes 25.5", 36000, "JPY", "2026-04-02", "used"],
];

export const COMPS: Comp[] = ROWS.map(([refId, source, title, amount, currency, soldAt, condition], i) => ({
  id: `comp-${i + 1}`,
  refId,
  source,
  title,
  price: { amount, currency },
  soldAt,
  condition,
}));
