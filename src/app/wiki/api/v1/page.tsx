import type { Metadata } from "next";
import { ApiV1Overview } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1",
  description:
    "Version 1 overview: public catalog reads, the bearer contract for future catalog writes, and a console that runs those reads.",
  alternates: {
    canonical: "/wiki/api/v1",
  },
};

export default function ApiV1Page() {
  return <ApiV1Overview />;
}
