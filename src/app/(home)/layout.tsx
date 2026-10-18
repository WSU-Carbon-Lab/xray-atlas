import { Newsreader } from "next/font/google";
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  adjustFontFallback: true,
  fallback: ["Georgia", "Cambria", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "X-ray spectroscopy database",
  description:
    "Open X-ray Atlas for NEXAFS and X-ray spectroscopy datasets with molecule search, spectrum browsing, and reproducible metadata.",
  alternates: {
    canonical: "/",
  },
};

/**
 * Home segment layout: registers the same serif display face as the blog
 * and publishes the route metadata. Does not fetch catalog data.
 */
export default function HomeLayout({
  children,
}: Readonly<{ children: ReactNode }>): ReactElement {
  return <div className={newsreader.variable}>{children}</div>;
}
