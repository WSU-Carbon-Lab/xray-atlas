import type { Metadata } from "next";
import { ApiV1Resource } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1 physics",
  description:
    "Version 1 Henke atomic form factor table for one element symbol.",
  alternates: {
    canonical: "/docs/api/v1/physics",
  },
};

export default function ApiV1PhysicsPage() {
  return (
    <ApiV1Resource
      tags={["Physics"]}
      title="Physics"
      lede="Fetch the Henke atomic form factor table for one element. The atom query is a chemical symbol such as C or Fe."
    />
  );
}
