"use client";

import { useEffect } from "react";
import { BeamDumpErrorPage } from "~/components/feedback/beam-dump-error-page";

export default function MoleculeDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Molecule detail error:", error);
  }, [error]);

  return (
    <BeamDumpErrorPage
      variant="server"
      statusLabel="Load fault"
      headline="Beam instability on this molecule"
      subcopy={
        error?.message ??
        "Something interrupted the photon stream while loading this structure. The operators are looking into it."
      }
      issueTitle="Molecule detail failed to load"
      onRetry={reset}
    />
  );
}
