import { Suspense, type ReactElement } from "react";
import Header from "~/components/layout/header";
import { getCachedWhatsNewSummary } from "~/lib/whats-new-summary";

/**
 * Loads the What's New highlight on the server and passes it to the client header.
 */
async function HeaderWithWhatsNew(): Promise<ReactElement> {
  const whatsNew = await getCachedWhatsNewSummary();
  return <Header whatsNew={whatsNew} />;
}

/**
 * Renders the site header without blocking the root layout on blog MDX scans.
 */
export function HeaderWhatsNewSuspense(): ReactElement {
  return (
    <Suspense fallback={<Header />}>
      <HeaderWithWhatsNew />
    </Suspense>
  );
}
