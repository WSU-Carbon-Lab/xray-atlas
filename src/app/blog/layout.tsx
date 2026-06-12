import { Newsreader } from "next/font/google";
import type { ReactElement, ReactNode } from "react";

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

/**
 * Blog segment layout: registers serif display typography without affecting wiki routes.
 */
export default function BlogLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  return <div className={newsreader.variable}>{children}</div>;
}
