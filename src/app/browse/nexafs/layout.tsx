import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse NEXAFS datasets",
  description:
    "Browse NEXAFS experiments by molecule, edge, facility, instrument, and geometry metadata in X-ray Atlas.",
  alternates: {
    canonical: "/browse/nexafs",
  },
};

export default function BrowseNexafsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
