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
import { BUTTON_GROUP_CHILD, Tooltip } from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  spectrumPointsToDetailedCsv,
  type SpectrumPolarizationNode,
} from "~/features/process-nexafs/utils";
import { showToast } from "~/components/ui/toast";
import {
  plotToolbarIconToolClass,
  plotToolbarTooltipContentClass,
} from "~/components/plots/toolbars";

/**
 * Top-rail spectrum menus: download or copy detailed spectrum CSV (all rows or one geometry slice),
 * with the same portal menu layout as dataset browse. Plot-as-PNG entries remain disabled placeholders.
 */

function formatThetaPhiLabel(theta: number | null, phi: number | null): string {
  const t =
    theta != null && Number.isFinite(theta) ? `${theta.toFixed(1)}` : "—";
  const p = phi != null && Number.isFinite(phi) ? `${phi.toFixed(1)}` : "—";
  return `θ ${t}°, φ ${p}°`;
}

function fileSuffixForGeometryLeaf(
  polKey: string,
  thetaKey: string,
  phiKey: string,
): string {
  const pol =
    polKey === "__none__"
      ? "pol-none"
      : `pol-${polKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const t =
    thetaKey === "none" ? "th-x" : `th${thetaKey.replace(/[^0-9.-]/g, "x")}`;
  const p =
    phiKey === "none" ? "ph-x" : `ph${phiKey.replace(/[^0-9.-]/g, "x")}`;
  return `${pol}-${t}-${p}`;
}

interface SpectrumGeometryCsvRow {
  id: string;
  label: string;
  rowCount: number;
  points: SpectrumPoint[];
  fileSuffix: string;
}

function spectrumGeometryCsvRowsFromTree(
  tree: SpectrumPolarizationNode[],
): SpectrumGeometryCsvRow[] {
  const rows: SpectrumGeometryCsvRow[] = [];
  for (const node of tree) {
    for (const t of node.thetaNodes) {
      for (const leaf of t.phiLeaves) {
        rows.push({
          id: `${node.polarizationKey}|${t.thetaKey}|${leaf.phiKey}`,
          label: formatThetaPhiLabel(t.theta, leaf.phi),
          rowCount: leaf.points.length,
          points: leaf.points,
          fileSuffix: fileSuffixForGeometryLeaf(
            node.polarizationKey,
            t.thetaKey,
            leaf.phiKey,
          ),
        });
      }
    }
  }
  return rows;
}

export type NexafsSpectrumRailCsvDropdownProps = {
  /**
   * When `"download"`, writes `spectrumPointsToDetailedCsv` to a file; when `"copy"`, places the same CSV text on the clipboard.
   */
  kind: "download" | "copy";
  /**
   * Disables the trigger and menu actions (for example no spectrum rows).
   */
  disabled: boolean;
  /**
   * Base name for downloaded files (without extension), for example `nexafs-experiment-abc12def` or `nexafs-upload-abc12def`.
   */
  filenameBase: string;
  /**
   * All spectrum samples sorted by energy ascending; used for the **All polarizations** menu row.
   */
  sortedAllPoints: SpectrumPoint[];
  /**
   * Polarization / theta / phi hierarchy from `groupSpectrumByPolarizationThetaPhi` so **By geometry** rows match browse.
   */
  groupedTree: SpectrumPolarizationNode[];
  [BUTTON_GROUP_CHILD]?: boolean;
};

/**
 * Icon trigger plus fixed-position menu: offers disabled plot-PNG placeholders, **All polarizations** CSV, and per-geometry CSV slices using `spectrumPointsToDetailedCsv`. Download path creates a blob download; copy path uses `navigator.clipboard.writeText` and toasts outcomes.
 */
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

    const downloadCsv = useCallback(
      (points: SpectrumPoint[], fileBase: string) => {
        if (points.length === 0) return;
        const csv = spectrumPointsToDetailedCsv(points);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileBase}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("CSV download started", "success");
      },
      [],
    );

    const copyCsv = useCallback((points: SpectrumPoint[]) => {
      if (points.length === 0) return;
      const csv = spectrumPointsToDetailedCsv(points);
      void navigator.clipboard.writeText(csv).then(
        () => {
          showToast(`Copied ${points.length} rows as CSV`, "success");
        },
        () => {
          showToast("Could not copy to clipboard", "error");
        },
      );
    }, []);

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
        downloadCsv(sortedAllPoints, filenameBase);
      } else {
        copyCsv(sortedAllPoints);
      }
      setOpen(false);
    }, [copyCsv, disabled, downloadCsv, filenameBase, kind, sortedAllPoints]);

    const runCsvGeometryLeaf = useCallback(
      (points: SpectrumPoint[], fileSuffix: string) => {
        if (disabled || points.length === 0) return;
        if (kind === "download") {
          downloadCsv(points, `${filenameBase}-${fileSuffix}`);
        } else {
          copyCsv(points);
        }
        setOpen(false);
      },
      [copyCsv, disabled, downloadCsv, filenameBase, kind],
    );

    const menuShellClass =
      "border-border bg-surface fixed z-50 max-h-[min(26rem,calc(100vh-2rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-2 shadow-2xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] scrollbar-thin";

    const sectionLabelClass =
      "px-2.5 pb-1.5 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] first:pt-0.5";

    const menuItemClass =
      "text-foreground hover:bg-default/90 focus-visible:ring-accent flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45";

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
            className={menuShellClass}
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <div className={sectionLabelClass}>Plot image (PNG)</div>
            <button
              type="button"
              disabled
              role="menuitem"
              title="Coming soon"
              className="text-muted bg-[color-mix(in_oklab,var(--surface-2)_55%,transparent)] flex w-full cursor-not-allowed flex-col items-start gap-0.5 rounded-xl border border-[color-mix(in_oklab,var(--border-default)_70%,transparent)] px-3 py-2.5 text-left opacity-75"
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
            <div className={sectionLabelClass}>All</div>
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={runCsvAll}
              className={menuItemClass}
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
            <div className={sectionLabelClass}>By geometry</div>
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
                  className={menuItemClass}
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

    return (
      <div className="relative inline-flex">
        <Tooltip delay={0}>
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
            {kind === "download" ? (
              <Download className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            ) : (
              <Copy className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            )}
          </button>
          <Tooltip.Content
            placement="bottom"
            className={plotToolbarTooltipContentClass}
          >
            {kind === "download"
              ? "Download data: Save spectrum CSV for every geometry or one slice."
              : "Copy data: Copy spectrum CSV for every geometry or one slice."}
          </Tooltip.Content>
        </Tooltip>
        {menuPortal}
      </div>
    );
  },
);
