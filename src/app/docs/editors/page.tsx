import type { Metadata } from "next";
import { site } from "~/app/brand";
import { ClientDocsSoon } from "~/components/docs/client-docs-soon";

export const metadata: Metadata = {
  title: "Editors",
  description: `Editor clients for ${site.name} are not published yet.`,
  alternates: {
    canonical: "/docs/editors",
  },
};

/**
 * Renders the coming-soon editor client guide.
 */
export default function EditorDocsPage() {
  return (
    <ClientDocsSoon
      title="Editors"
      summary="VS Code and Zed extensions will browse the catalog from the editor."
    />
  );
}
