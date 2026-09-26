// 2. SCRAPED LISTINGS — deliberately messy, badly described, multi-source.
// In the real app these come from the discovery adapters (Tavily search →
// fetch listing page → extract title/price/photos). Here they are fixed.
// Each photo's embedding is synthesised to sit at a chosen similarity from a
// reference image, standing in for what CLIP would return on a real photo.

import type { Listing, ListingPhoto, PhotoKind, Sketch } from "../types.ts";
import { genericEmbedding, nearTo } from "../mockEmbeddings.ts";
import { refImageById } from "./references.ts";

type Like = { ref: string; kind?: PhotoKind; c: number };

function photo(listingId: string, n: number, kind: PhotoKind, sketch: Sketch, like?: Like, ocrText?: string): ListingPhoto {
  const id = `${listingId}-p${n}`;
  const embedding = like
    ? nearTo(refImageById(`${like.ref}:${like.kind ?? kind}`).embedding, like.c, id, kind)
    : genericEmbedding(id, kind);
  return { id, kind, sketch, embedding, ocrText };
}

const carpet = "#e6ddd0";
const floor = "#d9d4cc";
const table = "#ece8e1";
const grey = "#dcdfe3";

export const LISTINGS: Listing[] = [
  {
    id: "mjp-4821",
    source: "mercari_jp",
    url: "https://jp.mercari.com/item/m00000000000",
    title: "靴 スエード 茶色 26cm 中古",
    titleGloss: "Shoes, suede, brown, 26cm, used",
    description: "父のクローゼットから出てきました。サイズ26cm。ブランド不明です。",
    price: { amount: 8800, currency: "JPY" },
    condition: "used",
    size: "26cm",
    location: "Saitama, JP",
    postedAt: "2026-09-25",
    photos: [
      photo("mjp-4821", 1, "side", { shape: "moc", color: "#9b7550", accent: "#654529", sole: "vibram", bg: carpet }, { ref: "visvim-fbt", c: 0.93 }),
      photo("mjp-4821", 2, "sole", { shape: "moc", color: "#9b7550", accent: "#333", sole: "vibram", bg: carpet }, { ref: "visvim-fbt", c: 0.91 }),
      photo("mjp-4821", 3, "tag", { shape: "moc", color: "#9b7550", accent: "#654529", sole: "vibram", bg: carpet, tagLines: ["VISV1M", "F8T", "MADE IN JAP"] }, { ref: "visvim-fbt", c: 0.89 }, "VISV1M F8T MADE IN JAP 8"),
    ],
  },
  {
    id: "yah-77310",
    source: "yahoo_auctions_jp",
    url: "https://auctions.yahoo.co.jp/jp/auction/x000000000",
    title: "ブーツ サイドジップ 黒 メンズ 現状品",
    titleGloss: "Boots, side zip, black, men's, as-is",
    description: "倉庫整理品です。ノークレームノーリターンでお願いします。",
    price: { amount: 7500, currency: "JPY" },
    condition: "worn",
    size: "3",
    location: "Osaka, JP",
    postedAt: "2026-09-24",
    photos: [
      photo("yah-77310", 1, "side", { shape: "boot", color: "#222", accent: "#444", sole: "flat", bg: floor }, { ref: "yohji-sidezip", c: 0.9 }),
      photo("yah-77310", 2, "detail", { shape: "boot", color: "#222", accent: "#8a8a8a", sole: "flat", bg: floor }, { ref: "yohji-sidezip", c: 0.87 }),
      photo("yah-77310", 3, "tag", { shape: "boot", color: "#222", accent: "#444", sole: "flat", bg: floor, tagLines: ["YOHJ YAMAM0TO", "POUR HOM"] }, { ref: "yohji-sidezip", c: 0.86 }, "YOHJ YAMAM0TO POUR HOM 3"),
    ],
  },
  {
    id: "eby-3920155",
    source: "ebay",
    url: "https://www.ebay.com/itm/000000000000",
    title: "weird shoes size 9 never worn",
    description: "Got these as a gift, not my style. Some kind of strappy high top. Smoke free home.",
    price: { amount: 45, currency: "USD" },
    condition: "like-new",
    size: "US 9",
    location: "Ohio, US",
    postedAt: "2026-09-25",
    photos: [
      photo("eby-3920155", 1, "side", { shape: "hightop", color: "#141414", accent: "#e0e0e0", sole: "cup", bg: grey }, { ref: "y3-qasa", c: 0.92 }),
      photo("eby-3920155", 2, "tag", { shape: "hightop", color: "#141414", accent: "#e0e0e0", sole: "cup", bg: grey, tagLines: ["Y-3", "YOHJI YAMAMOTO", "UK 8½ US 9"] }, { ref: "y3-qasa", c: 0.9 }, "Y-3 YOHJI YAMAMOTO adidas UK 8½ US 9"),
    ],
  },
  {
    id: "fbm-1188",
    source: "facebook_marketplace",
    url: "https://www.facebook.com/marketplace/item/0000000000",
    title: "Moccasin trainers, fringe, size 10",
    description: "Comfy suede moccasin style shoes with fringe. Collection Hackney.",
    price: { amount: 60, currency: "GBP" },
    condition: "used",
    size: "UK 10",
    location: "Hackney, London",
    postedAt: "2026-09-26",
    photos: [
      photo("fbm-1188", 1, "side", { shape: "moc", color: "#b58a5e", accent: "#7a5534", sole: "flat", bg: table }, { ref: "visvim-fbt", c: 0.86 }),
      photo("fbm-1188", 2, "tag", { shape: "moc", color: "#b58a5e", accent: "#7a5534", sole: "flat", bg: table, tagLines: ["MINNETONKA", "MOCCASIN", "SIZE 10"] }, { ref: "visvim-fbt", c: 0.74 }, "MINNETONKA MOCCASIN SIZE 10"),
    ],
  },
  {
    id: "est-5521",
    source: "estate_sale",
    url: "https://www.estatesales.net/",
    title: "Men's black leather shoes, lot of 3 pairs",
    description: "From a downtown loft estate. Sizes vary. Sold as a lot.",
    price: { amount: 30, currency: "USD" },
    condition: "used",
    location: "Brooklyn, US",
    postedAt: "2026-09-23",
    photos: [
      photo("est-5521", 1, "side", { shape: "derby", color: "#1a1a1a", accent: "#2d2d2d", sole: "lug", bg: floor }, { ref: "cdg-derby", c: 0.87 }),
    ],
  },
  {
    id: "mjp-9034",
    source: "mercari_jp",
    url: "https://jp.mercari.com/item/m00000000001",
    title: "ナイキ ランニング 逆走 27cm",
    titleGloss: "Nike running, Gyakusou, 27cm",
    description: "数回使用。箱なし。",
    price: { amount: 14500, currency: "JPY" },
    condition: "used",
    size: "27cm",
    location: "Tokyo, JP",
    postedAt: "2026-09-25",
    photos: [
      photo("mjp-9034", 1, "side", { shape: "runner", color: "#5f654a", accent: "#30342a", sole: "waffle", bg: grey }, { ref: "undercover-gyakusou", c: 0.91 }),
      photo("mjp-9034", 2, "tag", { shape: "runner", color: "#5f654a", accent: "#30342a", sole: "waffle", bg: grey, tagLines: ["GYAKUSOU", "逆走"] }, { ref: "undercover-gyakusou", c: 0.9 }, "GYAKUSOU 逆走 27"),
    ],
  },
  {
    id: "eby-4410032",
    source: "ebay",
    url: "https://www.ebay.com/itm/000000000001",
    title: "KAPITAL Sashiko Patchwork Sneakers EU 43 Boro Kountry",
    description: "Authentic Kapital sneakers, lightly worn, see photos.",
    price: { amount: 320, currency: "USD" },
    condition: "used",
    size: "EU 43",
    location: "California, US",
    postedAt: "2026-09-22",
    photos: [
      photo("eby-4410032", 1, "side", { shape: "patchwork", color: "#2f416a", accent: "#ebe3cf", sole: "flat", bg: table }, { ref: "kapital-sashiko", c: 0.93 }),
      photo("eby-4410032", 2, "tag", { shape: "patchwork", color: "#2f416a", accent: "#ebe3cf", sole: "flat", bg: table, tagLines: ["KAPITAL", "KOUNTRY"] }, { ref: "kapital-sashiko", c: 0.92 }, "KAPITAL KOUNTRY 43"),
    ],
  },
  {
    id: "yah-80215",
    source: "yahoo_auctions_jp",
    url: "https://auctions.yahoo.co.jp/jp/auction/x000000001",
    title: "スニーカー パッチワーク 刺し子 藍",
    titleGloss: "Sneakers, patchwork, sashiko, indigo",
    description: "古着屋の在庫です。サイズ表記なし、27cmくらい。",
    price: { amount: 4000, currency: "JPY" },
    condition: "used",
    size: "~27cm",
    location: "Okayama, JP",
    postedAt: "2026-09-26",
    photos: [
      photo("yah-80215", 1, "side", { shape: "patchwork", color: "#2a3a5e", accent: "#e4dcc8", sole: "flat", bg: carpet }, { ref: "kapital-sashiko", c: 0.9 }),
      photo("yah-80215", 2, "detail", { shape: "patchwork", color: "#2a3a5e", accent: "#e4dcc8", sole: "flat", bg: carpet }, { ref: "kapital-sashiko", c: 0.88 }),
      photo("yah-80215", 3, "tag", { shape: "patchwork", color: "#2a3a5e", accent: "#e4dcc8", sole: "flat", bg: carpet, tagLines: ["KAPlTAL"] }, { ref: "kapital-sashiko", c: 0.84 }, "KAPlTAL"),
    ],
  },
  {
    id: "fbm-2044",
    source: "facebook_marketplace",
    url: "https://www.facebook.com/marketplace/item/0000000001",
    title: "Designer-ish black trainers",
    description: "Not sure of the brand, look expensive. Size 9.",
    price: { amount: 40, currency: "GBP" },
    condition: "used",
    size: "UK 9",
    location: "Walthamstow, London",
    postedAt: "2026-09-26",
    photos: [
      photo("fbm-2044", 1, "side", { shape: "plain", color: "#202020", accent: "#fafafa", sole: "cup", bg: table }),
      photo("fbm-2044", 2, "tag", { shape: "plain", color: "#202020", accent: "#fafafa", sole: "cup", bg: table, tagLines: ["UK 9", "EUR 43", "CHINA"] }, undefined, "UK 9 EUR 43 MADE IN CHINA"),
    ],
  },
  {
    id: "eby-5507781",
    source: "ebay",
    url: "https://www.ebay.com/itm/000000000002",
    title: "Visvim FBT Folk Suede Moccasin Sneakers Size 9 US",
    description: "Classic FBT, good condition, original box.",
    price: { amount: 650, currency: "USD" },
    condition: "used",
    size: "US 9",
    location: "New York, US",
    postedAt: "2026-09-21",
    photos: [
      photo("eby-5507781", 1, "side", { shape: "moc", color: "#a07650", accent: "#6a4a2c", sole: "vibram", bg: grey }, { ref: "visvim-fbt", c: 0.94 }),
      photo("eby-5507781", 2, "tag", { shape: "moc", color: "#a07650", accent: "#6a4a2c", sole: "vibram", bg: grey, tagLines: ["visvim", "FBT"] }, { ref: "visvim-fbt", c: 0.93 }, "visvim FBT US 9"),
    ],
  },
  {
    id: "mjp-6612",
    source: "mercari_jp",
    url: "https://jp.mercari.com/item/m00000000002",
    title: "ギャルソン 革靴 25.5",
    titleGloss: "Garçons leather shoes 25.5",
    description: "古いものです。ソールすり減りあり。",
    price: { amount: 9800, currency: "JPY" },
    condition: "worn",
    size: "25.5cm",
    location: "Kyoto, JP",
    postedAt: "2026-09-24",
    photos: [
      photo("mjp-6612", 1, "side", { shape: "derby", color: "#181818", accent: "#2b2b2b", sole: "lug", bg: floor }, { ref: "cdg-derby", c: 0.9 }),
      photo("mjp-6612", 2, "sole", { shape: "derby", color: "#181818", accent: "#2b2b2b", sole: "lug", bg: floor }, { ref: "cdg-derby", c: 0.86 }),
      photo("mjp-6612", 3, "tag", { shape: "derby", color: "#181818", accent: "#2b2b2b", sole: "lug", bg: floor, tagLines: ["COMME des GARC0NS", "HOMME PL"] }, { ref: "cdg-derby", c: 0.85 }, "COMME des GARC0NS HOMME PL"),
    ],
  },
];

export const listingById = (id: string) => LISTINGS.find((l) => l.id === id);
