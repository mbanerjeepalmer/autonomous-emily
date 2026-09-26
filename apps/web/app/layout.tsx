import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  style: ["normal", "italic"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Autono Emily",
  description: "Finds under-catalogued Japanese designer footwear across messy marketplaces.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
