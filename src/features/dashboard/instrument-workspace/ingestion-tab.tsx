"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Label,
  Spinner,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Wand2 } from "lucide-react";
import type {
  DashboardReduceStepMetadata,
  DashboardRegionsStepMetadata,
  StxmRegionBounds,
} from "~/lib/dashboard-processing-session";
import { autoSampleIzeroRegions, sampleIzeroMasks } from "~/lib/stxm/regions";
import { reduceTwoRegion, regionSpectrumToRecord } from "~/lib/stxm/reduction";
import type { StxmWeightingMode } from "~/lib/stxm/estimators";
import { parseLocalStxmPair } from "~/features/dashboard/hooks/useStxmScanLoader";
import { showToast } from "~/components/ui/toast";
import { StxmScanHeatmap } from "./stxm-scan-heatmap";
import { StxmSpectrumPreview } from "./stxm-spectrum-preview";
import { FitPlaceholderStep } from "./regions-step";

const WEIGHTING_OPTIONS: Array<{ id: StxmWeightingMode; label: string }> = [
  { id: "poisson_mle", label: "Poisson MLE" },
  { id: "inverse_count", label: "Inverse count" },
  { id: "empirical", label: "Empirical" },
];

type IngestionTabProps = {
  hdrFile: File;
  ximFile: File;
  scanLabel: string;
  regionsMetadata: DashboardRegionsStepMetadata | undefined;
  reduceMetadata: DashboardReduceStepMetadata | undefined;
  onPersistRegions: (regions: DashboardRegionsStepMetadata) => Promise<void>;
  onPersistReduce: (reduce: DashboardReduceStepMetadata) => Promise<void>;
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
 * Ingestion tab: region editor, weighting mode, and spectrum reduction from local files.
 */
export function IngestionTab({
  hdrFile,
  ximFile,
  scanLabel,
  regionsMetadata,
  reduceMetadata,
  onPersistRegions,
  onPersistReduce,
  isSaving,
}: IngestionTabProps) {
  const [loaded, setLoaded] = useState<Awaited<
    ReturnType<typeof parseLocalStxmPair>
  > | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightingMode, setWeightingMode] = useState<StxmWeightingMode>(
    regionsMetadata?.weightingMode ?? "poisson_mle",
  );
  const [bounds, setBounds] = useState<StxmRegionBounds | null>(
    regionsMetadata?.bounds ?? null,
  );
  const [isReducing, setIsReducing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    void parseLocalStxmPair(hdrFile, ximFile)
      .then((result) => {
        if (!cancelled) {
          setLoaded(result);
          if (!regionsMetadata?.bounds) {
            setBounds(defaultBounds(result.oriented.spatial));
          }
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load scan",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hdrFile, regionsMetadata?.bounds, ximFile]);

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

  const handleSaveRegions = useCallback(async () => {
    if (!bounds) {
      return;
    }
    await onPersistRegions({
      scanId: regionsMetadata?.scanId ?? scanLabel,
      bounds,
      weightingMode,
    });
    showToast("Regions saved", "success");
  }, [bounds, onPersistRegions, regionsMetadata?.scanId, scanLabel, weightingMode]);

  const handleRecompute = useCallback(async () => {
    if (!loaded || !bounds) {
      return;
    }
    setIsReducing(true);
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
        scanId: regionsMetadata?.scanId ?? scanLabel,
        spectra: [regionSpectrumToRecord(spectrum)],
        computedAt: new Date().toISOString(),
        method: "two_region",
      });
      showToast("Spectra recomputed", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Reduction failed",
        "error",
      );
    } finally {
      setIsReducing(false);
    }
  }, [
    bounds,
    loaded,
    onPersistReduce,
    regionsMetadata?.scanId,
    scanLabel,
    weightingMode,
  ]);

  const spectra = useMemo(
    () => reduceMetadata?.spectra ?? [],
    [reduceMetadata?.spectra],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (loadError || !loaded || !bounds) {
    return (
      <p className="text-danger text-sm">{loadError ?? "Unable to load scan."}</p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={[weightingMode]}
          onSelectionChange={(keys) => {
            const key = [...keys][0];
            if (key === "poisson_mle" || key === "inverse_count" || key === "empirical") {
              setWeightingMode(key);
            }
          }}
        >
          {WEIGHTING_OPTIONS.map((option) => (
            <ToggleButton key={option.id} id={option.id} size="sm">
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button variant="secondary" size="sm" onPress={handleAutoSuggest}>
          <Wand2 className="h-3.5 w-3.5" aria-hidden />
          Auto regions
        </Button>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={isSaving}
          onPress={() => void handleSaveRegions()}
        >
          Save regions
        </Button>
        <Button
          variant="primary"
          size="sm"
          isDisabled={isSaving || isReducing}
          onPress={() => void handleRecompute()}
        >
          {isReducing ? (
            <>
              <Spinner size="sm" />
              Recomputing...
            </>
          ) : (
            "Recompute spectra"
          )}
        </Button>
      </div>

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

      {spectra.length > 0 ? (
        <StxmSpectrumPreview spectra={spectra} />
      ) : (
        <p className="text-muted text-sm">
          Adjust regions and click Recompute spectra to preview optical density.
        </p>
      )}
    </div>
  );
}

export function PreviewSpectraPlaceholder() {
  return (
    <div className="border-border bg-default/30 rounded-lg border border-dashed px-5 py-8">
      <p className="text-foreground text-sm font-medium">Preview spectra</p>
      <p className="text-muted mt-2 text-sm">
        Multi-scan spectrum comparison arrives in a later phase.
      </p>
    </div>
  );
}

export { FitPlaceholderStep as LcfPlaceholder };
