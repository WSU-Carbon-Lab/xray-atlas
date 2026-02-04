"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

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
    <div className="py-8">
      <ErrorState
        title="Failed to load molecule"
        message={
          error?.message ?? "An error occurred while loading the molecule."
        }
        onRetry={reset}
      />
    </div>
  );
}
