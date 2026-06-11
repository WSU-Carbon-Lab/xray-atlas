import Link from "next/link";
import type { ReactElement, ReactNode } from "react";

/**
 * Renders an accent-styled internal navigation link for wiki MDX call-to-action blocks.
 *
 * @param props.href - App Router path passed to Next.js `Link`.
 * @param props.children - Link label rendered inside the button-styled anchor.
 */
export function CtaLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): ReactElement {
  return (
    <Link
      href={href}
      className="bg-accent text-accent-foreground inline-flex rounded-lg px-4 py-2 text-sm font-medium"
    >
      {children}
    </Link>
  );
}
