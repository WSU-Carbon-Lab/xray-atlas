"use client";

import { useEffect } from "react";
import { BeamDumpErrorPage } from "~/components/feedback/beam-dump-error-page";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return <BeamDumpErrorPage variant="server" onRetry={reset} />;
}
