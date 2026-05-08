import type { Metadata } from "next";
import { ApiV1Reference } from "~/components/about/api-v1-reference";

export const metadata: Metadata = {
  title: "API v1",
  description: "Version 1 public API reference with grouped route and method details.",
  alternates: {
    canonical: "/wiki/api/v1",
  },
};

export default function ApiV1Page() {
  return (
    <ApiV1Reference />
  );
}
