import type { Metadata } from "next";
import { site } from "~/app/brand";
import { ClientDocsSoon } from "~/components/docs/client-docs-soon";

export const metadata: Metadata = {
  title: "Python",
  description: `The Python client for ${site.name} is not published yet.`,
  alternates: {
    canonical: "/docs/python",
  },
};

/**
 * Renders the coming-soon Python client guide.
 */
export default function PythonDocsPage() {
  return (
    <ClientDocsSoon
      title="Python"
      summary="The Python client will load catalog records into analysis code."
    />
  );
}
