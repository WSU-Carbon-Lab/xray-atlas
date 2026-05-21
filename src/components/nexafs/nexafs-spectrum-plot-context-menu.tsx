"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download } from "lucide-react";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  copySpectrumCsv,
  downloadSpectrumCsv,
  spectrumCsvMenuItemClass,
  spectrumCsvMenuSectionLabelClass,
  spectrumCsvMenuShellClass,
  type SpectrumGeometryCsvRow,
} from "~/components/nexafs/nexafs-spectrum-csv-shared";

export type NexafsSpectrumPlotContextMenuProps = {
  open: boolean;
  anchor: { top: number; left: number };
  onClose: () => void;
  filenameBase: string;
  sortedAllPoints: SpectrumPoint[];
  geometryRow: SpectrumGeometryCsvRow | null;
};

function clampMenuPosition(
  top: number,
  left: number,
  menuWidth: number,
  menuHeight: number,
): { top: number; left: number } {
  if (typeof window === "undefined") {
    return { top, left };
  }
  const margin = 8;
  const maxLeft = window.innerWidth - menuWidth - margin;
  const maxTop = window.innerHeight - menuHeight - margin;
  return {
    top: Math.min(Math.max(margin, top), Math.max(margin, maxTop)),
    left: Math.min(Math.max(margin, left), Math.max(margin, maxLeft)),
  };
}

/**
 * Minimal plot context menu: only actionable CSV copy/download entries (no disabled browser chrome).
 */
export function NexafsSpectrumPlotContextMenu({
  open,
  anchor,
  onClose,
  filenameBase,
  sortedAllPoints,
  geometryRow,
}: NexafsSpectrumPlotContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState(anchor);

  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el || typeof window === "undefined") {
      setMenuPos(anchor);
      return;
    }
    const rect = el.getBoundingClientRect();
    const menuWidth = Math.min(352, window.innerWidth - 16);
    setMenuPos(
      clampMenuPosition(anchor.top, anchor.left, menuWidth, rect.height),
    );
  }, [open, anchor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  const runCopyAll = useCallback(() => {
    copySpectrumCsv(sortedAllPoints);
    onClose();
  }, [sortedAllPoints, onClose]);

  const runDownloadAll = useCallback(() => {
    downloadSpectrumCsv(sortedAllPoints, filenameBase);
    onClose();
  }, [filenameBase, sortedAllPoints, onClose]);

  const runCopyGeometry = useCallback(() => {
    if (!geometryRow || geometryRow.points.length === 0) return;
    copySpectrumCsv(geometryRow.points);
    onClose();
  }, [geometryRow, onClose]);

  const runDownloadGeometry = useCallback(() => {
    if (!geometryRow || geometryRow.points.length === 0) return;
    downloadSpectrumCsv(
      geometryRow.points,
      `${filenameBase}-${geometryRow.fileSuffix}`,
    );
    onClose();
  }, [filenameBase, geometryRow, onClose]);

  if (!open || sortedAllPoints.length === 0) {
    return null;
  }

  const showGeometry = geometryRow != null && geometryRow.points.length > 0;

  const menuPortal =
    typeof document !== "undefined" &&
    createPortal(
      <>
        <div className="fixed inset-0 z-40" aria-hidden onClick={onClose} />
        <div
          ref={menuRef}
          role="menu"
          aria-label="Spectrum data"
          className={spectrumCsvMenuShellClass}
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className={spectrumCsvMenuSectionLabelClass}>Dataset</div>
          <button
            type="button"
            role="menuitem"
            onClick={runCopyAll}
            className={spectrumCsvMenuItemClass}
          >
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              <Copy className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              Copy dataset
            </span>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              {sortedAllPoints.length}{" "}
              {sortedAllPoints.length === 1 ? "row" : "rows"}
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={runDownloadAll}
            className={spectrumCsvMenuItemClass}
          >
            <span className="flex w-full items-center gap-2 text-sm font-medium">
              <Download
                className="size-4 shrink-0"
                strokeWidth={1.5}
                aria-hidden
              />
              Download dataset
            </span>
            <span className="text-xs tabular-nums text-[var(--text-secondary)]">
              CSV file
            </span>
          </button>
          {showGeometry ? (
            <>
              <div
                className="my-2 h-px bg-[color-mix(in_oklab,var(--border-default)_85%,transparent)]"
                role="separator"
              />
              <div className={spectrumCsvMenuSectionLabelClass}>
                {geometryRow.label}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={runCopyGeometry}
                className={spectrumCsvMenuItemClass}
              >
                <span className="flex w-full items-center gap-2 text-sm font-medium">
                  <Copy
                    className="size-4 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  Copy this angle
                </span>
                <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                  {geometryRow.rowCount}{" "}
                  {geometryRow.rowCount === 1 ? "row" : "rows"}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={runDownloadGeometry}
                className={spectrumCsvMenuItemClass}
              >
                <span className="flex w-full items-center gap-2 text-sm font-medium">
                  <Download
                    className="size-4 shrink-0"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  Download this angle
                </span>
                <span className="text-xs tabular-nums text-[var(--text-secondary)]">
                  CSV file
                </span>
              </button>
            </>
          ) : null}
        </div>
      </>,
      document.body,
    );

  return menuPortal;
}
