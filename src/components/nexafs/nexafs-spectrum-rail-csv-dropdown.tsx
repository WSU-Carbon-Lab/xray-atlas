"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Accordion } from "@heroui/react";
import { Copy, Download } from "lucide-react";
import { BUTTON_GROUP_CHILD } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type { SpectrumPoint } from "~/components/plots/types";
import type { SpectrumPolarizationNode } from "~/features/process-nexafs/utils";
import {
  plotToolbarIconToolClass,
  PlotToolbarRichHint,
} from "~/components/plots/toolbars";
import {
  copySpectrumCsv,
  downloadSpectrumCsv,
  spectrumCsvMenuItemClass,
  spectrumCsvMenuSectionLabelClass,
  spectrumCsvMenuShellClass,
  spectrumCsvMenuDisabledItemClass,
  spectrumGeometryCsvRowsFromTree,
  type NexafsSpectrumCsvExportOptions,
} from "~/components/nexafs/nexafs-spectrum-csv-shared";
import { trpc } from "~/trpc/client";
import {
  downloadAuxFileFromSignedUrl,
  downloadDatasetAllDataBundle,
} from "~/lib/aux-file-download";
import { showToast } from "~/components/ui/toast";

const SPECTRUM_RAIL_DOWNLOAD_HINT_LINE =
  "Save spectrum CSV, all-data archive, or auxiliary files.";
const SPECTRUM_RAIL_COPY_HINT_LINE =
  "Copy spectrum CSV for every geometry or one slice.";

const downloadMenuAccordionClass =
  "border-border w-full rounded-xl border bg-transparent";

function formatAuxFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type NexafsSpectrumRailCsvDropdownProps = {
  kind: "download" | "copy";
  disabled: boolean;
  filenameBase: string;
  sortedAllPoints: SpectrumPoint[];
  groupedTree: SpectrumPolarizationNode[];
  csvExportOptions?: NexafsSpectrumCsvExportOptions;
  /** When set on the download menu, enables all-data bundle and auxiliary file rows. */
  experimentId?: string;
  sampleId?: string | null;
  [BUTTON_GROUP_CHILD]?: boolean;
};

export const NexafsSpectrumRailCsvDropdown = memo(
  function NexafsSpectrumRailCsvDropdown({
    kind,
    disabled,
    filenameBase,
    sortedAllPoints,
    groupedTree,
    csvExportOptions,
    experimentId,
    sampleId,
    [BUTTON_GROUP_CHILD]: _buttonGroupChild,
  }: NexafsSpectrumRailCsvDropdownProps) {
    const [open, setOpen] = useState(false);
    const [auxDownloadBusyId, setAuxDownloadBusyId] = useState<string | null>(
      null,
    );
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const utils = trpc.useUtils();

    const geometryCsvRows = useMemo(
      () => spectrumGeometryCsvRowsFromTree(groupedTree),
      [groupedTree],
    );

    const downloadExtrasEnabled =
      kind === "download" && Boolean(experimentId) && !disabled;

    const experimentAuxQuery = trpc.experimentFile.list.useQuery(
      { experimentId: experimentId ?? "" },
      {
        enabled: open && downloadExtrasEnabled && Boolean(experimentId),
      },
    );

    const sampleAuxQuery = trpc.sampleFile.list.useQuery(
      { sampleId: sampleId ?? "" },
      {
        enabled:
          open && downloadExtrasEnabled && Boolean(sampleId),
      },
    );

    const experimentAuxFiles = experimentAuxQuery.data ?? [];
    const sampleAuxFiles = sampleAuxQuery.data ?? [];

    const updateMenuPosition = useCallback(() => {
      const el = triggerRef.current;
      if (!el || typeof window === "undefined") return;
      const r = el.getBoundingClientRect();
      const margin = 8;
      const menuWidth = Math.min(352, window.innerWidth - margin * 2);
      let left = r.left;
      if (left + menuWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - menuWidth - margin);
      }
      setMenuPos({ top: r.bottom + margin, left });
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      updateMenuPosition();
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;
      const onResize = () => updateMenuPosition();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }, [open, updateMenuPosition]);

    useEffect(() => {
      if (!open) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
      if (!open) return;
      const onDoc = (e: MouseEvent) => {
        const t = e.target as Node;
        if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
          return;
        }
        setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const ariaLabel =
      kind === "download"
        ? "Download spectrum data"
        : "Copy spectrum data to clipboard";

    const menuAriaLabel =
      kind === "download" ? "Choose what to download" : "Choose what to copy";

    const triggerClassName = cn(
      buttonVariants({ variant: "tertiary" }),
      plotToolbarIconToolClass,
      kind === "download"
        ? "!rounded-s-none !rounded-e-none"
        : "!rounded-s-none !rounded-e-3xl",
    );

    const runCsvAll = useCallback(() => {
      if (disabled) return;
      if (kind === "download") {
        void downloadSpectrumCsv(sortedAllPoints, filenameBase, csvExportOptions);
      } else {
        copySpectrumCsv(sortedAllPoints, csvExportOptions);
      }
      setOpen(false);
    }, [csvExportOptions, disabled, filenameBase, kind, sortedAllPoints]);

    const runAllDataBundle = useCallback(() => {
      if (!experimentId || disabled) return;
      downloadDatasetAllDataBundle(experimentId);
      setOpen(false);
    }, [disabled, experimentId]);

    const runCsvGeometryLeaf = useCallback(
      (points: SpectrumPoint[], fileSuffix: string) => {
        if (disabled || points.length === 0) return;
        if (kind === "download") {
          void downloadSpectrumCsv(
            points,
            `${filenameBase}-${fileSuffix}`,
            csvExportOptions,
          );
        } else {
          copySpectrumCsv(points, csvExportOptions);
        }
        setOpen(false);
      },
      [csvExportOptions, disabled, filenameBase, kind],
    );

    const runExperimentAuxDownload = useCallback(
      async (fileId: string, originalFilename: string) => {
        if (!experimentId || disabled) return;
        setAuxDownloadBusyId(fileId);
        try {
          const result = await utils.experimentFile.getDownloadUrl.fetch({
            experimentId,
            fileId,
          });
          await downloadAuxFileFromSignedUrl(
            result.signedUrl,
            result.originalFilename || originalFilename,
          );
          setOpen(false);
        } catch {
          showToast("Could not download experiment file", "error");
        } finally {
          setAuxDownloadBusyId(null);
        }
      },
      [disabled, experimentId, utils.experimentFile.getDownloadUrl],
    );

    const runSampleAuxDownload = useCallback(
      async (fileId: string, originalFilename: string) => {
        if (!sampleId || disabled) return;
        setAuxDownloadBusyId(fileId);
        try {
          const result = await utils.sampleFile.getDownloadUrl.fetch({
            sampleId,
            fileId,
          });
          await downloadAuxFileFromSignedUrl(
            result.signedUrl,
            result.originalFilename || originalFilename,
          );
          setOpen(false);
        } catch {
          showToast("Could not download sample file", "error");
        } finally {
          setAuxDownloadBusyId(null);
        }
      },
      [disabled, sampleId, utils.sampleFile.getDownloadUrl],
    );

    const geometryAccordionBody = (
      <div className="flex flex-col gap-0.5 px-1 pb-1">
        {geometryCsvRows.map((row) => (
          <button
            key={row.id}
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => runCsvGeometryLeaf(row.points, row.fileSuffix)}
            className={spectrumCsvMenuItemClass}
          >
            <span className="font-mono text-sm font-medium tracking-tight">
              {row.label}
            </span>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {row.rowCount} {row.rowCount === 1 ? "row" : "rows"}
            </span>
          </button>
        ))}
      </div>
    );

    const copyGeometryList = (
      <div className="flex flex-col gap-0.5">
        {geometryCsvRows.map((row) => (
          <button
            key={row.id}
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => runCsvGeometryLeaf(row.points, row.fileSuffix)}
            className={spectrumCsvMenuItemClass}
          >
            <span className="font-mono text-sm font-medium tracking-tight">
              {row.label}
            </span>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {row.rowCount} {row.rowCount === 1 ? "row" : "rows"}
            </span>
          </button>
        ))}
      </div>
    );

    const menuPortal =
      open &&
      typeof document !== "undefined" &&
      createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            aria-label={menuAriaLabel}
            className={spectrumCsvMenuShellClass}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className={spectrumCsvMenuSectionLabelClass}>Plot image (PNG)</div>
            <button
              type="button"
              disabled
              role="menuitem"
              title="Coming soon"
              className={spectrumCsvMenuDisabledItemClass}
            >
              <span className="text-sm font-medium">
                {kind === "download"
                  ? "Download plot as PNG"
                  : "Copy plot as PNG"}
              </span>
              <span className="text-xs text-[var(--text-tertiary)]">
                Coming soon
              </span>
            </button>
            <div
              className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
              role="separator"
            />
            <div className={spectrumCsvMenuSectionLabelClass}>All</div>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={runCsvAll}
              className={spectrumCsvMenuItemClass}
            >
              <span className="text-sm font-medium">All polarizations</span>
              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                {sortedAllPoints.length}{" "}
                {sortedAllPoints.length === 1 ? "row" : "rows"}
              </span>
            </button>
            {downloadExtrasEnabled ? (
              <button
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={runAllDataBundle}
                className={spectrumCsvMenuItemClass}
              >
                <span className="text-sm font-medium">All data</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  CSV + experiment-aux + sample-aux (.tar.gz)
                </span>
              </button>
            ) : null}
            <div
              className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
              role="separator"
            />
            {kind === "download" && downloadExtrasEnabled ? (
              <Accordion
                allowsMultipleExpanded
                variant="surface"
                aria-label="Download by geometry and auxiliary files"
                className={downloadMenuAccordionClass}
              >
                <Accordion.Item id="by-geometry">
                  <Accordion.Heading>
                    <Accordion.Trigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start">
                      <span className="text-sm font-medium">By geometry</span>
                      <Accordion.Indicator className="text-muted shrink-0">
                        <ChevronDownIcon className="size-4" aria-hidden />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="pt-0">{geometryAccordionBody}</Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="aux-experiment">
                  <Accordion.Heading>
                    <Accordion.Trigger
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
                      isDisabled={experimentAuxFiles.length === 0}
                    >
                      <span className="text-sm font-medium">Aux experiment</span>
                      <Accordion.Indicator className="text-muted shrink-0">
                        <ChevronDownIcon className="size-4" aria-hidden />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="pt-0">
                      {experimentAuxFiles.length === 0 ? (
                        <p className="text-muted px-3 py-2 text-xs">
                          No experiment auxiliary files on record.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-0.5 px-1 pb-1">
                          {experimentAuxFiles.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              role="menuitem"
                              disabled={
                                auxDownloadBusyId === file.id || disabled
                              }
                              onClick={() =>
                                void runExperimentAuxDownload(
                                  file.id,
                                  file.originalFilename,
                                )
                              }
                              className={spectrumCsvMenuItemClass}
                            >
                              <span className="line-clamp-2 text-sm font-medium">
                                {file.originalFilename}
                              </span>
                              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                                {formatAuxFileSize(file.sizeBytes)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item id="aux-sample">
                  <Accordion.Heading>
                    <Accordion.Trigger
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start"
                      isDisabled={
                        !sampleId || sampleAuxFiles.length === 0
                      }
                    >
                      <span className="text-sm font-medium">Aux sample</span>
                      <Accordion.Indicator className="text-muted shrink-0">
                        <ChevronDownIcon className="size-4" aria-hidden />
                      </Accordion.Indicator>
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="pt-0">
                      {!sampleId ? (
                        <p className="text-muted px-3 py-2 text-xs">
                          No sample linked to this dataset.
                        </p>
                      ) : sampleAuxFiles.length === 0 ? (
                        <p className="text-muted px-3 py-2 text-xs">
                          No sample auxiliary files on record.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-0.5 px-1 pb-1">
                          {sampleAuxFiles.map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              role="menuitem"
                              disabled={
                                auxDownloadBusyId === file.id || disabled
                              }
                              onClick={() =>
                                void runSampleAuxDownload(
                                  file.id,
                                  file.originalFilename,
                                )
                              }
                              className={spectrumCsvMenuItemClass}
                            >
                              <span className="line-clamp-2 text-sm font-medium">
                                {file.originalFilename}
                              </span>
                              <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                                {formatAuxFileSize(file.sizeBytes)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            ) : (
              <>
                <div className={spectrumCsvMenuSectionLabelClass}>By geometry</div>
                {copyGeometryList}
              </>
            )}
          </div>
        </>,
        document.body,
      );

    const hintTitle =
      kind === "download" ? "Download spectrum CSV" : "Copy spectrum CSV";
    const hintDescription =
      kind === "download"
        ? SPECTRUM_RAIL_DOWNLOAD_HINT_LINE
        : SPECTRUM_RAIL_COPY_HINT_LINE;

    const iconGlyph =
      kind === "download" ? (
        <Download className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      ) : (
        <Copy className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
      );

    return (
      <div className="relative inline-flex">
        <PlotToolbarRichHint
          title={hintTitle}
          description={hintDescription}
          whenDisabledDescription="Wait for spectrum points to load, or upload a file with measured data."
          disabled={disabled}
        >
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-haspopup="menu"
            className={triggerClassName}
            onClick={() => {
              if (disabled) return;
              setOpen((v) => !v);
            }}
          >
            {iconGlyph}
          </button>
        </PlotToolbarRichHint>
        {menuPortal}
      </div>
    );
  },
);
