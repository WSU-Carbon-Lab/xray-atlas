"use client";

import type { ChangeEvent } from "react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import {
  Button,
  ErrorMessage,
  Label,
  ScrollShadow,
  Spinner,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { FileText, Trash2, Upload } from "lucide-react";
import type {
  StxmIngestScanRecord,
  StxmIngestStorageMode,
} from "~/lib/dashboard-processing-session";
import {
  candidateXimNamesForHdr,
  discoverStxmPairsFromAuxFiles,
  loadStxm,
  mapAuxFilesByFilename,
} from "~/lib/stxm";
import { usePersistedAuxUpload } from "~/features/process-nexafs/hooks/usePersistedAuxUpload";
import { parseLocalStxmPair, useStxmScanLoader } from "~/features/dashboard/hooks/useStxmScanLoader";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { StxmScanHeatmap } from "./stxm-scan-heatmap";

type IngestStepProps = {
  experimentId: string | null;
  scans: StxmIngestScanRecord[];
  activeScanId: string | null;
  storageMode: StxmIngestStorageMode;
  onScansChange: (scans: StxmIngestScanRecord[]) => void;
  onPersistIngest: (payload: {
    scans: StxmIngestScanRecord[];
    activeScanId: string | null;
    storageMode: StxmIngestStorageMode;
  }) => Promise<void>;
  isSaving: boolean;
};

function buildScanSummary(
  hdrFile: File,
  ximFile: File,
  loaded: ReturnType<typeof loadStxm>,
  fileIds?: { hdrId?: string; ximId?: string },
): StxmIngestScanRecord {
  return {
    id: crypto.randomUUID(),
    hdrFileName: hdrFile.name,
    ximFileName: ximFile.name,
    hdrExperimentFileId: fileIds?.hdrId,
    ximExperimentFileId: fileIds?.ximId,
    isNexafsLineScan: loaded.isNexafsLineScan,
    paxisCount: loaded.header.paxisCount,
    qaxisCount: loaded.header.qaxisCount,
    paxisName: loaded.header.paxisName,
    qaxisName: loaded.header.qaxisName,
    energyMinEv: loaded.energyMinEv,
    energyMaxEv: loaded.energyMaxEv,
    parsedAt: new Date().toISOString(),
    selected: false,
  };
}

/**
 * Ingest step: browse experiment-aux STXM pairs, upload raw files, parse in-browser,
 * and persist summaries on the processing session.
 */
export function IngestStep({
  experimentId,
  scans,
  activeScanId,
  storageMode,
  onScansChange,
  onPersistIngest,
  isSaving,
}: IngestStepProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewScanId, setPreviewScanId] = useState<string | null>(
    activeScanId ?? scans[0]?.id ?? null,
  );
  const [localPreview, setLocalPreview] = useState<{
    image: Float64Array[];
    spatial: Float64Array;
  } | null>(null);

  const auxListQuery = trpc.experimentFile.list.useQuery(
    { experimentId: experimentId ?? "" },
    { enabled: Boolean(experimentId) },
  );

  const { uploadExperimentFiles } = usePersistedAuxUpload({
    experimentId,
    sampleId: null,
    onValidationError: (message) => showToast(message, "error"),
  });

  const auxPairs = useMemo(
    () =>
      discoverStxmPairsFromAuxFiles(
        (auxListQuery.data ?? []).map((file) => ({
          id: file.id,
          originalFilename: file.originalFilename,
        })),
      ),
    [auxListQuery.data],
  );

  const manifestScanKeys = useMemo(
    () =>
      new Set(
        scans.map(
          (scan) =>
            `${scan.hdrFileName.toLowerCase()}::${scan.ximFileName.toLowerCase()}`,
        ),
      ),
    [scans],
  );

  const persistScans = useCallback(
    async (
      nextScans: StxmIngestScanRecord[],
      nextActiveId: string | null = nextScans[0]?.id ?? null,
      nextStorageMode: StxmIngestStorageMode = storageMode,
    ) => {
      onScansChange(nextScans);
      await onPersistIngest({
        scans: nextScans,
        activeScanId: nextActiveId,
        storageMode: nextStorageMode,
      });
    },
    [onPersistIngest, onScansChange, storageMode],
  );

  const resolveFileIdsAfterUpload = useCallback(
    async (hdrName: string, ximName: string) => {
      if (!experimentId) {
        return {};
      }
      const rows = await utils.experimentFile.list.fetch({
        experimentId,
      });
      const byName = mapAuxFilesByFilename(
        rows.map((file) => ({
          id: file.id,
          originalFilename: file.originalFilename,
        })),
      );
      return {
        hdrId: byName.get(hdrName.toLowerCase()),
        ximId: byName.get(ximName.toLowerCase()),
      };
    },
    [experimentId, utils.experimentFile.list],
  );

  const ingestLocalPair = useCallback(
    async (hdrFile: File, ximFile: File, uploadRaw: boolean) => {
      if (uploadRaw && experimentId) {
        const uploadResult = await uploadExperimentFiles(
          [hdrFile, ximFile],
          "raw_data",
          "STXM line scan (dashboard ingest)",
        );
        if (!uploadResult || uploadResult.failed.length > 0) {
          throw new Error(
            uploadResult?.failed[0]?.message ?? "Upload failed",
          );
        }
      }

      const hdrText = await hdrFile.text();
      const ximBuffer = await ximFile.arrayBuffer();
      const loaded = loadStxm(hdrText, ximBuffer);
      const fileIds = uploadRaw
        ? await resolveFileIdsAfterUpload(hdrFile.name, ximFile.name)
        : {};

      const summary = buildScanSummary(hdrFile, ximFile, loaded, fileIds);
      const nextScans = [...scans, summary];
      await persistScans(
        nextScans,
        summary.id,
        experimentId ? "experiment_aux" : storageMode,
      );

      const oriented = await parseLocalStxmPair(hdrFile, ximFile);
      setPreviewScanId(summary.id);
      setLocalPreview({
        image: oriented.oriented.image,
        spatial: oriented.oriented.spatial,
      });
      return summary;
    },
    [
      experimentId,
      persistScans,
      resolveFileIdsAfterUpload,
      scans,
      storageMode,
      uploadExperimentFiles,
    ],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      if (!experimentId) {
        setErrorMessage("Link an Atlas experiment before uploading line scans.");
        return;
      }

      const files = Array.from(fileList);
      const hdrFiles = files.filter((file) =>
        file.name.toLowerCase().endsWith(".hdr"),
      );
      if (hdrFiles.length === 0) {
        setErrorMessage("Select at least one .hdr file (and matching .xim).");
        return;
      }

      setIsParsing(true);
      setErrorMessage(null);
      let added = 0;

      try {
        for (const hdrFile of hdrFiles) {
          const ximFile = files.find((file) =>
            candidateXimNamesForHdr(hdrFile.name).some(
              (name) => file.name.toLowerCase() === name.toLowerCase(),
            ),
          );
          if (!ximFile) {
            setErrorMessage(`Missing .xim for ${hdrFile.name}.`);
            continue;
          }
          await ingestLocalPair(hdrFile, ximFile, true);
          added += 1;
        }
        if (added > 0) {
          showToast(
            added === 1 ? "Line scan ingested" : `${added} line scans ingested`,
            "success",
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to ingest line scan";
        setErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsParsing(false);
      }
    },
    [experimentId, ingestLocalPair],
  );

  const importFromAux = useCallback(
    async (pair: (typeof auxPairs)[number]) => {
      if (!experimentId) {
        return;
      }
      const key = `${pair.hdrFileName.toLowerCase()}::${pair.ximFileName.toLowerCase()}`;
      if (manifestScanKeys.has(key)) {
        setPreviewScanId(
          scans.find(
            (scan) =>
              scan.hdrFileName.toLowerCase() ===
                pair.hdrFileName.toLowerCase() &&
              scan.ximFileName.toLowerCase() === pair.ximFileName.toLowerCase(),
          )?.id ?? null,
        );
        return;
      }

      setIsParsing(true);
      setErrorMessage(null);
      try {
        const [hdrUrl, ximUrl] = await Promise.all([
          utils.experimentFile.getDownloadUrl.fetch({
            experimentId,
            fileId: pair.hdrExperimentFileId,
          }),
          utils.experimentFile.getDownloadUrl.fetch({
            experimentId,
            fileId: pair.ximExperimentFileId,
          }),
        ]);
        const [hdrResp, ximResp] = await Promise.all([
          fetch(hdrUrl.signedUrl),
          fetch(ximUrl.signedUrl),
        ]);
        if (!hdrResp.ok || !ximResp.ok) {
          throw new Error("Failed to fetch aux files for parsing");
        }
        const hdrText = await hdrResp.text();
        const ximBuffer = await ximResp.arrayBuffer();
        const loaded = loadStxm(hdrText, ximBuffer);
        const summary: StxmIngestScanRecord = {
          id: crypto.randomUUID(),
          hdrFileName: pair.hdrFileName,
          ximFileName: pair.ximFileName,
          hdrExperimentFileId: pair.hdrExperimentFileId,
          ximExperimentFileId: pair.ximExperimentFileId,
          isNexafsLineScan: loaded.isNexafsLineScan,
          paxisCount: loaded.header.paxisCount,
          qaxisCount: loaded.header.qaxisCount,
          paxisName: loaded.header.paxisName,
          qaxisName: loaded.header.qaxisName,
          energyMinEv: loaded.energyMinEv,
          energyMaxEv: loaded.energyMaxEv,
          parsedAt: new Date().toISOString(),
          selected: false,
        };
        const nextScans = [...scans, summary];
        await persistScans(nextScans, summary.id, "experiment_aux");
        setPreviewScanId(summary.id);
        setLocalPreview(null);
        showToast("Imported from experiment aux", "success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Import failed";
        setErrorMessage(message);
        showToast(message, "error");
      } finally {
        setIsParsing(false);
      }
    },
    [experimentId, manifestScanKeys, persistScans, scans, utils.experimentFile],
  );

  const removeScan = useCallback(
    async (scanId: string) => {
      const nextScans = scans.filter((scan) => scan.id !== scanId);
      const nextActive =
        previewScanId === scanId
          ? (nextScans[0]?.id ?? null)
          : (previewScanId ?? nextScans[0]?.id ?? null);
      setPreviewScanId(nextActive);
      await persistScans(nextScans, nextActive);
      showToast("Removed scan from session manifest", "success");
    },
    [persistScans, previewScanId, scans],
  );

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files.length > 0) {
      void handleFiles(files);
    }
    event.target.value = "";
  };

  const previewScan = scans.find((scan) => scan.id === previewScanId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted text-sm leading-relaxed">
        Upload paired <span className="font-mono">.hdr</span> and{" "}
        <span className="font-mono">.xim</span> files to experiment-aux when an
        experiment is linked, or import pairs already on the dataset. Parsing runs
        in your browser; summaries stay on this session for reduction.
      </p>

      {!experimentId ? (
        <p className="text-warning text-sm">
          Link an Atlas experiment above before ingesting line scans.
        </p>
      ) : null}

      {experimentId && auxPairs.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-foreground text-sm font-medium">
            Experiment aux STXM pairs
          </p>
          <ScrollShadow className="max-h-40">
            <ul className="flex flex-col gap-1">
              {auxPairs.map((pair) => {
                const inManifest = manifestScanKeys.has(
                  `${pair.hdrFileName.toLowerCase()}::${pair.ximFileName.toLowerCase()}`,
                );
                return (
                  <li
                    key={`${pair.hdrExperimentFileId}-${pair.ximExperimentFileId}`}
                    className="border-border flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="text-foreground min-w-0 truncate text-sm">
                      {pair.hdrFileName}
                    </span>
                    <Button
                      variant={inManifest ? "secondary" : "primary"}
                      size="sm"
                      isDisabled={isParsing || isSaving}
                      onPress={() => void importFromAux(pair)}
                    >
                      {inManifest ? "Preview" : "Import"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </ScrollShadow>
        </section>
      ) : null}

      <div
        className={cn(
          "border-border bg-default/30 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-10",
          (isParsing || isSaving || !experimentId) && "opacity-70",
        )}
      >
        <Upload className="text-muted h-8 w-8" aria-hidden />
        <div className="text-center">
          <Label htmlFor={inputId} className="text-foreground text-sm font-medium">
            Upload line scan files
          </Label>
          <p className="text-muted mt-1 text-xs">
            Select .hdr and matching .xim together
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={isParsing || isSaving || !experimentId}
          onPress={() => inputRef.current?.click()}
        >
          {isParsing ? (
            <>
              <Spinner size="sm" />
              Processing...
            </>
          ) : (
            "Choose files"
          )}
        </Button>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept=".hdr,.xim"
          multiple
          className="sr-only"
          onChange={onInputChange}
        />
      </div>

      {errorMessage ? <ErrorMessage>{errorMessage}</ErrorMessage> : null}

      {scans.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {scans.map((scan) => (
            <li
              key={scan.id}
              className={cn(
                "border-border bg-surface rounded-md border px-4 py-3",
                previewScanId === scan.id && "border-accent",
              )}
            >
              <div className="flex items-start gap-3">
                <FileText
                  className="text-accent mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="text-foreground text-left text-sm font-medium hover:underline"
                    onClick={() => setPreviewScanId(scan.id)}
                  >
                    {scan.hdrFileName}
                  </button>
                  <p className="text-muted font-mono text-xs">{scan.ximFileName}</p>
                  <dl className="text-muted mt-2 grid gap-1 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="inline">Type: </dt>
                      <dd className="inline">
                        {scan.isNexafsLineScan
                          ? "NEXAFS line scan"
                          : "STXM scan"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Shape: </dt>
                      <dd className="inline">
                        {scan.qaxisCount} x {scan.paxisCount}
                      </dd>
                    </div>
                    {scan.energyMinEv !== null && scan.energyMaxEv !== null ? (
                      <div className="sm:col-span-2">
                        <dt className="inline">Energy: </dt>
                        <dd className="inline tabular-nums">
                          {scan.energyMinEv.toFixed(1)}–
                          {scan.energyMaxEv.toFixed(1)} eV
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={`Remove ${scan.hdrFileName}`}
                  isDisabled={isSaving}
                  onPress={() => void removeScan(scan.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted text-sm">No line scans ingested yet.</p>
      )}

      {localPreview && previewScanId ? (
        <StxmScanHeatmap
          image={localPreview.image}
          spatialAxis={localPreview.spatial}
        />
      ) : previewScan &&
        experimentId &&
        previewScan.hdrExperimentFileId &&
        previewScan.ximExperimentFileId ? (
        <IngestHeatmapPreview
          experimentId={experimentId}
          scan={previewScan}
        />
      ) : null}
    </div>
  );
}

function IngestHeatmapPreview({
  experimentId,
  scan,
}: {
  experimentId: string;
  scan: StxmIngestScanRecord;
}) {
  const { loaded, error, isLoading } = useStxmScanLoader({
    scanId: scan.id,
    experimentId,
    hdrFileId: scan.hdrExperimentFileId,
    ximFileId: scan.ximExperimentFileId,
    hdrFileName: scan.hdrFileName,
    ximFileName: scan.ximFileName,
    localHdrFile: null,
    localXimFile: null,
  });
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }
  if (error || !loaded) {
    return null;
  }
  return (
    <StxmScanHeatmap
      image={loaded.oriented.image}
      spatialAxis={loaded.oriented.spatial}
    />
  );
}
