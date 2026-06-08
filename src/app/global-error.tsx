"use client";

import { useEffect } from "react";
import { Geist } from "next/font/google";
import { BeamDumpErrorPage } from "~/components/feedback/beam-dump-error-page";
import "~/styles/globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

/**
 * Root-level failure boundary when the root layout cannot render.
 * Re-declares document shell and global styles because this segment replaces `layout.tsx`.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en" className={`${geist.variable} min-h-screen w-full`}>
      <body className="bg-background text-foreground flex min-h-screen flex-col">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
          <BeamDumpErrorPage variant="server" onRetry={reset} />
        </main>
      </body>
    </html>
  );
}
