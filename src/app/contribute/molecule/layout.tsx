import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute molecule",
  description:
    "Submit molecule records with identifiers and metadata to expand search and linking across X-ray Atlas datasets.",
  alternates: {
    canonical: "/contribute/molecule",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ContributeMoleculeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
