import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute NEXAFS dataset",
  description:
    "Upload NEXAFS experiments with instrument, edge, and geometry metadata to X-ray Atlas.",
  alternates: {
    canonical: "/contribute/nexafs",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ContributeNexafsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
