import type { Metadata } from "next";
import { site } from "~/app/brand";
import { ClientDocsSoon } from "~/components/docs/client-docs-soon";

export const metadata: Metadata = {
  title: "Igor Pro",
  description: `The Igor Pro client for ${site.name} is not published yet.`,
  alternates: {
    canonical: "/docs/igor",
  },
};

/**
 * Renders the coming-soon Igor Pro client guide.
 */
export default function IgorDocsPage() {
  return (
    <ClientDocsSoon
      title="Igor Pro"
      summary="The Igor Pro client will load catalog spectra into an experiment."
    />
  );
}
