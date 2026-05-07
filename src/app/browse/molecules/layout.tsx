import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse molecules",
  description:
    "Browse molecules in X-ray Atlas with searchable identifiers, dataset counts, and linked NEXAFS experiment context.",
  alternates: {
    canonical: "/browse/molecules",
  },
};

export default function BrowseMoleculesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
