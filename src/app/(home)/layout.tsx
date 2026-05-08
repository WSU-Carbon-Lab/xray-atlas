import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "X-ray spectroscopy database",
  description:
    "Open X-ray Atlas for NEXAFS and X-ray spectroscopy datasets with molecule search, spectrum browsing, and reproducible metadata.",
  alternates: {
    canonical: "/",
  },
};

export default function HomeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
