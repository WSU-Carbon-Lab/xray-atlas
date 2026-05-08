import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute spectroscopy data",
  description:
    "Contribute molecules, facilities, and NEXAFS datasets to X-ray Atlas with structured metadata and attribution-ready records.",
  alternates: {
    canonical: "/contribute",
  },
};

export default function ContributeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
