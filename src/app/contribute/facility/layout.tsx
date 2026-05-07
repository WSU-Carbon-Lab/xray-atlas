import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contribute facility",
  description:
    "Register a facility and instruments for spectroscopy submissions in X-ray Atlas contribution workflows.",
  alternates: {
    canonical: "/contribute/facility",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ContributeFacilityLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
