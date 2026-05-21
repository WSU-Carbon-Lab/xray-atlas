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
} from "~/components/nexafs/nexafs-spectrum-csv-shared";

const SPECTRUM_RAIL_DOWNLOAD_HINT_LINE =
  "Save spectrum CSV for every geometry or one slice.";
const SPECTRUM_RAIL_COPY_HINT_LINE =
  "Copy spectrum CSV for every geometry or one slice.";

export type NexafsSpectrumRailCsvDropdownProps = {
  kind: "download" | "copy";
  disabled: boolean;
  filenameBase: string;
  sortedAllPoints: SpectrumPoint[];
  groupedTree: SpectrumPolarizationNode[];
  [BUTTON_GROUP_CHILD]?: boolean;
};

export const NexafsSpectrumRailCsvDropdown = memo(
  function NexafsSpectrumRailCsvDropdown({
    kind,
    disabled,
    filenameBase,
    sortedAllPoints,
    groupedTree,
    [BUTTON_GROUP_CHILD]: _buttonGroupChild,
  }: NexafsSpectrumRailCsvDropdownProps) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    const geometryCsvRows = useMemo(
      () => spectrumGeometryCsvRowsFromTree(groupedTree),
      [groupedTree],
    );

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
        downloadSpectrumCsv(sortedAllPoints, filenameBase);
      } else {
        copySpectrumCsv(sortedAllPoints);
      }
      setOpen(false);
    }, [disabled, filenameBase, kind, sortedAllPoints]);

    const runCsvGeometryLeaf = useCallback(
      (points: SpectrumPoint[], fileSuffix: string) => {
        if (disabled || points.length === 0) return;
        if (kind === "download") {
          downloadSpectrumCsv(points, `${filenameBase}-${fileSuffix}`);
        } else {
          copySpectrumCsv(points);
        }
        setOpen(false);
      },
      [disabled, filenameBase, kind],
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
            <div
              className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
              role="separator"
            />
            <div className={spectrumCsvMenuSectionLabelClass}>By geometry</div>
            <div className="flex flex-col gap-0.5">
              {geometryCsvRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() =>
                    runCsvGeometryLeaf(row.points, row.fileSuffix)
                  }
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
