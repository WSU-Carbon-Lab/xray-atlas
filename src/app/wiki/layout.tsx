/**
 * Next.js App Router layout for `/wiki/*` documentation routes.
 *
 * Applies wiki chrome at full viewport width: the inner wrapper uses a horizontal breakout
 * (`calc(-50vw + 50%)` margins and `w-screen`) so content is not capped by the root
 * `main` `max-w-7xl` constraint. The `/about` landing page is separate from this tree.
 *
 * Layout methodology aligns structurally with the HeroUI v3 docs notebook shell (see
 * `heroui` `apps/docs/src/app/docs/layout.tsx`): left documentation rail, central article,
 * right outline rail, and drawer-style navigation on small viewports (implemented here with
 * `@heroui/react` {@link Drawer} rather than vendoring `fumadocs-ui`).
 */

import type { ReactElement, ReactNode } from "react";
import { WikiDocShell } from "~/components/about/wiki-doc-shell";

export default function AboutWikiLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return (
    <div className="relative mx-[calc(-50vw+50%)] box-border w-screen max-w-[100vw] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <WikiDocShell>{children}</WikiDocShell>
    </div>
  );
}
