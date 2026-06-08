"use client";

import { useCallback, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import type {
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  StxmIngestScanRecord,
} from "~/lib/dashboard-processing-session";
import { reduceTwoRegion, regionSpectrumToRecord } from "~/lib/stxm/reduction";
import { sampleIzeroMasks } from "~/lib/stxm/regions";
import { useStxmScanLoader } from "~/features/dashboard/hooks/useStxmScanLoader";
import { showToast } from "~/components/ui/toast";
import { StxmSpectrumPreview } from "./stxm-spectrum-preview";

type ReduceStepProps = {
  experimentId: string | null;
  scans: StxmIngestScanRecord[];
  regionsMetadata: DashboardRegionsStepMetadata | undefined;
  reduceMetadata: DashboardReduceStepMetadata | undefined;
  onPersistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
  isSaving: boolean;
};

/**
 * Runs browser-side Beer-Lambert reduction and previews resulting OD spectra.
 */
export function ReduceStep({
  experimentId,
  scans,
  regionsMetadata,
  reduceMetadata,
  onPersistReduce,
  isSaving,
}: ReduceStepProps) {
  const scanId = regionsMetadata?.scanId ?? scans[0]?.id ?? null;
  const activeScan = scans.find((scan) => scan.id === scanId) ?? null;
  const bounds = regionsMetadata?.bounds;
  const weightingMode = regionsMetadata?.weightingMode ?? "poisson_mle";

  const { loaded, error, isLoading } = useStxmScanLoader({
    scanId: activeScan?.id ?? "",
    experimentId,
    hdrFileId: activeScan?.hdrExperimentFileId,
    ximFileId: activeScan?.ximExperimentFileId,
    hdrFileName: activeScan?.hdrFileName ?? "",
    ximFileName: activeScan?.ximFileName ?? "",
    localHdrFile: null,
    localXimFile: null,
  });

  const [isRunning, setIsRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (!loaded || !bounds || !scanId) {
      return;
    }
    setIsRunning(true);
    try {
      const { sampleMask, izeroMask } = sampleIzeroMasks(
        loaded.oriented.spatial,
        bounds.sampleLo,
        bounds.sampleHi,
        bounds.izeroLo,
        bounds.izeroHi,
      );
      const spectrum = reduceTwoRegion(
        loaded.oriented.image,
        sampleMask,
        izeroMask,
        loaded.oriented.energyEv,
        "sample",
        weightingMode,
      );
      await onPersistReduce({
        scanId,
        spectra: [regionSpectrumToRecord(spectrum)],
        computedAt: new Date().toISOString(),
        method: "two_region",
      });
      showToast("Reduction complete", "success");
    } catch (runError) {
      const message =
        runError instanceof Error ? runError.message : "Reduction failed";
      showToast(message, "error");
    } finally {
      setIsRunning(false);
    }
  }, [bounds, loaded, onPersistReduce, scanId, weightingMode]);

  if (!bounds) {
    return (
      <p className="text-muted text-sm">
        Define sample and izero regions before running reduction.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-muted text-sm">
          Weighting: <span className="text-foreground">{weightingMode}</span>
        </p>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!loaded || isSaving || isRunning}
          onPress={() => void handleRun()}
        >
          {isRunning ? (
            <>
              <Spinner size="sm" />
              Reducing...
            </>
          ) : (
            "Run reduction"
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : null}

      {reduceMetadata?.spectra.length ? (
        <StxmSpectrumPreview spectra={reduceMetadata.spectra} />
      ) : (
        <p className="text-muted text-sm">
          Run reduction to preview optical density vs energy.
        </p>
      )}
    </div>
  );
}
