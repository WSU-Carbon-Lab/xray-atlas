import type { Metadata } from "next";
import { ApiV1Resource } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1 molecules",
  description: "Version 1 molecule catalog, edge summary, and search redirect.",
  alternates: {
    canonical: "/docs/api/v1/molecules",
  },
};

export default function ApiV1MoleculesPage() {
  return (
    <ApiV1Resource
      tags={["Molecules", "Compatibility"]}
      title="Molecules"
      lede="List the catalog, read edges for one molecule, or resolve a name search. Search redirects to the molecule page or the browse list."
    />
  );
}
