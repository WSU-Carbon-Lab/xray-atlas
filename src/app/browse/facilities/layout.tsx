import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse facilities",
  description:
    "Browse synchrotron and lab facilities in X-ray Atlas with registered instruments and linked spectroscopy datasets.",
  alternates: {
    canonical: "/browse/facilities",
  },
};

export default function BrowseFacilitiesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
