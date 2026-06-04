"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { Wand2 } from "lucide-react";
import type {
  DashboardRegionsStepMetadata,
  StxmIngestScanRecord,
  StxmRegionBounds,
} from "~/lib/dashboard-processing-session";
import { autoSampleIzeroRegions } from "~/lib/stxm/regions";
import { useStxmScanLoader } from "~/features/dashboard/hooks/useStxmScanLoader";
import { showToast } from "~/components/ui/toast";
import { StxmScanHeatmap } from "./stxm-scan-heatmap";

type RegionsStepProps = {
  experimentId: string | null;
  scans: StxmIngestScanRecord[];
  regionsMetadata: DashboardRegionsStepMetadata | undefined;
  onPersistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  isSaving: boolean;
};

function defaultBounds(spatial: Float64Array): StxmRegionBounds {
  const yMin = spatial[0] ?? 0;
  const yMax = spatial[spatial.length - 1] ?? 1;
  const span = yMax - yMin || 1;
  return {
    sampleLo: yMin + span * 0.55,
    sampleHi: yMax - span * 0.05,
    izeroLo: yMin + span * 0.05,
    izeroHi: yMin + span * 0.35,
  };
}

/**
 * Region editor for sample and izero bars on an oriented STXM line scan.
 */
export function RegionsStep({
  experimentId,
  scans,
  regionsMetadata,
  onPersistRegions,
  isSaving,
}: RegionsStepProps) {
  const activeScanId = regionsMetadata?.scanId ?? scans[0]?.id ?? null;
  const activeScan = scans.find((scan) => scan.id === activeScanId) ?? null;

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

  const spatial = loaded?.oriented.spatial;
  const initialBounds = useMemo(() => {
    if (regionsMetadata?.bounds) {
      return regionsMetadata.bounds;
    }
    if (spatial && spatial.length > 0) {
      return defaultBounds(spatial);
    }
    return null;
  }, [regionsMetadata?.bounds, spatial]);

  const [bounds, setBounds] = useState<StxmRegionBounds | null>(initialBounds);

  useEffect(() => {
    setBounds(initialBounds);
  }, [activeScanId, initialBounds]);

  const handleAutoSuggest = useCallback(() => {
    if (!loaded) {
      return;
    }
    const [sampleLo, sampleHi, izeroLo, izeroHi] = autoSampleIzeroRegions(
      loaded.oriented.image,
      loaded.oriented.spatial,
    );
    setBounds({ sampleLo, sampleHi, izeroLo, izeroHi });
    showToast("Auto-suggested region bounds", "success");
  }, [loaded]);

  const handleSave = useCallback(async () => {
    if (!activeScanId || !bounds) {
      return;
    }
    await onPersistRegions({
      scanId: activeScanId,
      bounds,
      autoSuggested: false,
      weightingMode: regionsMetadata?.weightingMode ?? "poisson_mle",
    });
    showToast("Regions saved", "success");
  }, [activeScanId, bounds, onPersistRegions, regionsMetadata?.weightingMode]);

  if (scans.length === 0) {
    return (
      <p className="text-muted text-sm">
        Ingest at least one line scan before defining regions.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField className="min-w-[12rem]">
          <Label>Line scan</Label>
          <select
            className="border-border bg-surface text-foreground w-full rounded-md border px-3 py-2 text-sm"
            value={activeScanId ?? ""}
            onChange={(event) => {
              const scanId = event.target.value;
              void onPersistRegions({
                scanId,
                bounds: bounds ?? undefined,
                weightingMode: regionsMetadata?.weightingMode ?? "poisson_mle",
              });
            }}
          >
            {scans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.hdrFileName}
              </option>
            ))}
          </select>
        </TextField>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={!loaded || isSaving}
          onPress={handleAutoSuggest}
        >
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Auto-suggest
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={!bounds || isSaving}
          onPress={() => void handleSave()}
        >
          Save regions
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <p className="text-danger text-sm">{error}</p>
      ) : loaded && bounds ? (
        <>
          <StxmScanHeatmap
            image={loaded.oriented.image}
            spatialAxis={loaded.oriented.spatial}
            bounds={bounds}
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["sampleLo", "Sample low"],
                ["sampleHi", "Sample high"],
                ["izeroLo", "Izero low"],
                ["izeroHi", "Izero high"],
              ] as const
            ).map(([key, label]) => (
              <TextField key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  step="any"
                  value={String(bounds[key])}
                  onChange={(event) => {
                    const parsed = Number.parseFloat(event.target.value);
                    if (Number.isFinite(parsed)) {
                      setBounds((prev) =>
                        prev ? { ...prev, [key]: parsed } : prev,
                      );
                    }
                  }}
                />
              </TextField>
            ))}
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">
          Link an experiment and upload aux files to load the heatmap for region editing.
        </p>
      )}
    </div>
  );
}

export function FitPlaceholderStep() {
  return (
    <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
      <p className="text-foreground text-sm font-medium">Blend fitting</p>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        Linear combination fitting against Atlas reference spectra. Ships in Phase 4.
      </p>
    </div>
  );
}

export function ExportPlaceholderStep() {
  return (
    <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
      <p className="text-foreground text-sm font-medium">Export or upload</p>
      <p className="text-muted mt-2 text-sm leading-relaxed">
        Export CSV or publish to Atlas with attribution. Ships in Phase 5.
      </p>
    </div>
  );
}
