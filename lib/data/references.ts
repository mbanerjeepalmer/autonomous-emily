// 1. TARGET UNIVERSE — the "known-good" reference set.
// Illustrative entries for the prototype: verify details against real archive
// pieces before relying on them, and replace sketches with real photos.

import type { Brand, PhotoKind, ReferenceItem, Sketch } from "../types.ts";
import { referenceEmbedding } from "../mockEmbeddings.ts";

export const BRANDS: Brand[] = [
  { id: "visvim", name: "visvim", variants: ["visvim", "ヴィズヴィム", "ビズビム", "vis vim", "visvin", "vizvim"] },
  { id: "yohji", name: "Yohji Yamamoto", variants: ["Yohji Yamamoto", "ヨウジヤマモト", "山本耀司", "yohji", "yoji yamamoto", "yohji yamamato", "yohij yamamoto"] },
  { id: "y3", name: "Y-3", parent: "yohji", variants: ["Y-3", "Y3", "ワイスリー"] },
  { id: "undercover", name: "Undercover", variants: ["UNDERCOVER", "アンダーカバー", "under cover", "undercovr", "undercoverism"] },
  { id: "kapital", name: "Kapital", variants: ["KAPITAL", "キャピタル", "kapitol", "kapital kountry"] },
  { id: "cdg", name: "Comme des Garçons", variants: ["COMME des GARÇONS", "COMME des GARCONS", "コムデギャルソン", "ギャルソン", "CDG", "comme de garcon", "come des garcons", "川久保玲"] },
];

type Def = Omit<ReferenceItem, "images"> & { images: { kind: PhotoKind; caption: string; sketch: Sketch }[] };

const DEFS: Def[] = [
  {
    id: "visvim-fbt",
    brandId: "visvim",
    model: "FBT moccasin sneaker",
    era: "2001 – present (early colourways most sought)",
    materials: ["Suede", "Elk leather"],
    details: ["Moccasin-construction upper", "Fringe across the vamp", "Lugged rubber sole unit", "Sole-pattern and heel-tab branding"],
    keywords: ["fbt", "moccasin", "fringe", "モカシン", "フリンジ"],
    images: [
      { kind: "side", caption: "Profile — fringe and moc toe", sketch: { shape: "moc", color: "#a57c52", accent: "#6f4e2f", sole: "vibram" } },
      { kind: "sole", caption: "Outsole lug pattern", sketch: { shape: "moc", color: "#a57c52", accent: "#2b2b2b", sole: "vibram" } },
      { kind: "tag", caption: "Insole / tongue label", sketch: { shape: "moc", color: "#a57c52", accent: "#6f4e2f", sole: "vibram", tagLines: ["visvim", "FBT", "MADE IN JAPAN"] } },
    ],
  },
  {
    id: "yohji-sidezip",
    brandId: "yohji",
    model: "Pour Homme side-zip leather boot",
    era: "Late 1990s – 2000s archive",
    materials: ["Calf leather", "Leather sole"],
    details: ["Inside zip running full shaft", "Elongated squared toe", "Stacked leather heel"],
    keywords: ["side zip", "sidezip", "サイドジップ", "pour homme", "プールオム"],
    images: [
      { kind: "side", caption: "Profile — shaft and toe shape", sketch: { shape: "boot", color: "#1d1d1f", accent: "#3a3a3c", sole: "flat" } },
      { kind: "detail", caption: "Zip close-up", sketch: { shape: "boot", color: "#1d1d1f", accent: "#9a9a9a", sole: "flat" } },
      { kind: "tag", caption: "Inner shaft label", sketch: { shape: "boot", color: "#1d1d1f", accent: "#3a3a3c", sole: "flat", tagLines: ["Yohji Yamamoto", "POUR HOMME", "MADE IN JAPAN"] } },
    ],
  },
  {
    id: "y3-qasa",
    brandId: "y3",
    model: "Qasa High",
    era: "2012 – 2015",
    materials: ["Neoprene/mesh upper", "Leather straps"],
    details: ["Sock-like collar", "Strap cage over the upper", "Sculpted cupsole"],
    keywords: ["qasa", "カーサ", "quasa"],
    images: [
      { kind: "side", caption: "Profile — strap cage", sketch: { shape: "hightop", color: "#111", accent: "#e8e8e8", sole: "cup" } },
      { kind: "sole", caption: "Outsole", sketch: { shape: "hightop", color: "#111", accent: "#d8d8d8", sole: "cup" } },
      { kind: "tag", caption: "Tongue / size label", sketch: { shape: "hightop", color: "#111", accent: "#e8e8e8", sole: "cup", tagLines: ["Y-3", "YOHJI YAMAMOTO", "adidas"] } },
    ],
  },
  {
    id: "undercover-gyakusou",
    brandId: "undercover",
    model: "Nike × Undercover Gyakusou runner",
    era: "2010 – 2020",
    materials: ["Engineered mesh", "Synthetic overlays"],
    details: ["Muted earth-tone colourways", "GYAKUSOU / 逆走 branding on tongue or insole"],
    keywords: ["gyakusou", "逆走", "ギャクソウ"],
    images: [
      { kind: "side", caption: "Profile", sketch: { shape: "runner", color: "#5b6147", accent: "#2f3326", sole: "waffle" } },
      { kind: "tag", caption: "Insole print", sketch: { shape: "runner", color: "#5b6147", accent: "#2f3326", sole: "waffle", tagLines: ["GYAKUSOU", "逆走", "UNDERCOVER"] } },
    ],
  },
  {
    id: "kapital-sashiko",
    brandId: "kapital",
    model: "Sashiko patchwork sneaker",
    era: "2010s",
    materials: ["Boro/sashiko canvas", "Rubber"],
    details: ["Patchwork canvas panels", "Visible running-stitch (sashiko)", "Vulcanised sole"],
    keywords: ["sashiko", "刺し子", "boro", "ボロ", "patchwork", "パッチワーク"],
    images: [
      { kind: "side", caption: "Profile — patchwork panels", sketch: { shape: "patchwork", color: "#2c3e63", accent: "#e9e2d0", sole: "flat" } },
      { kind: "detail", caption: "Sashiko stitch close-up", sketch: { shape: "patchwork", color: "#2c3e63", accent: "#e9e2d0", sole: "flat" } },
      { kind: "tag", caption: "Heel / insole label", sketch: { shape: "patchwork", color: "#2c3e63", accent: "#e9e2d0", sole: "flat", tagLines: ["KAPITAL", "KOUNTRY", "JAPAN"] } },
    ],
  },
  {
    id: "cdg-derby",
    brandId: "cdg",
    model: "Homme Plus archive derby",
    era: "1990s – 2000s",
    materials: ["Calf leather", "Rubber sole"],
    details: ["Plain-toe derby", "Oversized rounded last", "Insole stamp"],
    keywords: ["homme plus", "オムプリュス", "derby", "ダービー"],
    images: [
      { kind: "side", caption: "Profile — rounded last", sketch: { shape: "derby", color: "#161616", accent: "#2a2a2a", sole: "lug" } },
      { kind: "sole", caption: "Outsole", sketch: { shape: "derby", color: "#161616", accent: "#2a2a2a", sole: "lug" } },
      { kind: "tag", caption: "Insole stamp", sketch: { shape: "derby", color: "#161616", accent: "#2a2a2a", sole: "lug", tagLines: ["COMME des GARÇONS", "HOMME PLUS", "MADE IN JAPAN"] } },
    ],
  },
];

export const REFERENCES: ReferenceItem[] = DEFS.map((d) => ({
  ...d,
  images: d.images.map((img) => ({
    id: `${d.id}:${img.kind}`,
    refId: d.id,
    ...img,
    embedding: referenceEmbedding(d.id, img.kind),
  })),
}));

export const brandById = (id: string) => BRANDS.find((b) => b.id === id)!;
export const refById = (id: string) => REFERENCES.find((r) => r.id === id)!;
export const refImageById = (id: string) => REFERENCES.flatMap((r) => r.images).find((i) => i.id === id)!;
