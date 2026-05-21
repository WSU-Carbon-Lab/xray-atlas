import type { SpectrumPoint } from "~/components/plots/types";
import {
  spectrumPointsToDetailedCsv,
  type SpectrumPolarizationNode,
} from "~/features/process-nexafs/utils";
import { showToast } from "~/components/ui/toast";
import type { TraceData } from "~/components/plots/types";
import { parseTraceGeometryIdentity } from "~/components/plots/spectrum/parse-trace-geometry-identity";

export function formatThetaPhiLabel(theta: number | null, phi: number | null): string {
  const t =
    theta != null && Number.isFinite(theta) ? `${theta.toFixed(1)}` : "—";
  const p = phi != null && Number.isFinite(phi) ? `${phi.toFixed(1)}` : "—";
  return `θ ${t}°, φ ${p}°`;
}

export function fileSuffixForGeometryLeaf(
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

export interface SpectrumGeometryCsvRow {
  id: string;
  label: string;
  rowCount: number;
  points: SpectrumPoint[];
  fileSuffix: string;
}

export function spectrumGeometryCsvRowsFromTree(
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

function thetaPhiFromSpectrumPoint(
  point: SpectrumPoint | undefined,
): { theta?: number; phi?: number } {
  if (!point) {
    return {};
  }
  const theta =
    typeof point.theta === "number" && Number.isFinite(point.theta)
      ? point.theta
      : undefined;
  const phi =
    typeof point.phi === "number" && Number.isFinite(point.phi)
      ? point.phi
      : undefined;
  return { theta, phi };
}

function anglesMatchRow(
  row: SpectrumGeometryCsvRow,
  theta: number | undefined,
  phi: number | undefined,
): boolean {
  const sample = row.points[0];
  const rowAngles = thetaPhiFromSpectrumPoint(sample);
  const thetaMatch =
    theta === undefined
      ? rowAngles.theta === undefined
      : rowAngles.theta !== undefined &&
        Math.abs(rowAngles.theta - theta) < 0.05;
  const phiMatch =
    phi === undefined
      ? rowAngles.phi === undefined
      : rowAngles.phi !== undefined && Math.abs(rowAngles.phi - phi) < 0.05;
  return thetaMatch && phiMatch;
}

function geometryFromTrace(trace: TraceData): { theta?: number; phi?: number } {
  const theta =
    typeof trace.theta === "number" && Number.isFinite(trace.theta)
      ? trace.theta
      : undefined;
  const phi =
    typeof trace.phi === "number" && Number.isFinite(trace.phi)
      ? trace.phi
      : undefined;
  return { theta, phi };
}

/**
 * Maps a hovered or inspected plot trace to the browse CSV geometry leaf that carries full persisted columns for that slice.
 */
export function resolveSpectrumGeometryCsvRowForTrace(
  trace: TraceData | null,
  geometryCsvRows: SpectrumGeometryCsvRow[],
): SpectrumGeometryCsvRow | null {
  if (geometryCsvRows.length === 0) {
    return null;
  }
  if (geometryCsvRows.length === 1) {
    return geometryCsvRows[0] ?? null;
  }
  if (!trace) {
    return null;
  }

  const identity = parseTraceGeometryIdentity(trace);
  const fromKey = identity.geometryKey;
  const parsed =
    fromKey != null && fromKey.length > 0
      ? (() => {
          if (fromKey === "fixed") {
            return {};
          }
          const [thetaRaw, phiRaw] = fromKey.split(":");
          const theta = Number(thetaRaw);
          const phi = Number(phiRaw);
          return {
            theta: Number.isFinite(theta) ? theta : undefined,
            phi: Number.isFinite(phi) ? phi : undefined,
          };
        })()
      : geometryFromTrace(trace);

  const candidates = geometryCsvRows.filter((row) =>
    anglesMatchRow(row, parsed.theta, parsed.phi),
  );
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  const traceLen = Array.isArray(trace.x) ? trace.x.length : 0;
  const byLen = candidates.filter((row) => row.rowCount === traceLen);
  if (byLen.length === 1) {
    return byLen[0] ?? null;
  }

  return candidates[0] ?? null;
}

export function downloadSpectrumCsv(
  points: SpectrumPoint[],
  fileBase: string,
): void {
  if (points.length === 0) {
    return;
  }
  const csv = spectrumPointsToDetailedCsv(points);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV download started", "success");
}

/** Builds the detailed CSV string written to the clipboard for total-dataset copy. */
export function spectrumCsvClipboardText(points: SpectrumPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  return spectrumPointsToDetailedCsv(points);
}

export function copySpectrumCsv(points: SpectrumPoint[]): void {
  if (points.length === 0) {
    return;
  }
  const csv = spectrumCsvClipboardText(points);
  void navigator.clipboard.writeText(csv).then(
    () => {
      showToast(`Copied ${points.length} rows as CSV`, "success");
    },
    () => {
      showToast("Could not copy to clipboard", "error");
    },
  );
}

/**
 * Hijacks a native `copy` event on the plot surface: prevents default image/text copy and writes total-dataset CSV into `clipboardData`.
 */
export function copySpectrumCsvOnCopyEvent(
  event: ClipboardEvent,
  points: SpectrumPoint[],
): void {
  if (points.length === 0) {
    return;
  }
  event.preventDefault();
  event.clipboardData?.setData("text/plain", spectrumCsvClipboardText(points));
  showToast(`Copied ${points.length} rows as CSV`, "success");
}

export const spectrumCsvMenuShellClass =
  "border-border bg-surface fixed z-50 max-h-[min(26rem,calc(100vh-2rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border p-2 shadow-2xl ring-1 ring-[color-mix(in_oklab,var(--foreground)_8%,transparent)] scrollbar-thin";

export const spectrumCsvMenuSectionLabelClass =
  "px-2.5 pb-1.5 pt-2 text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] first:pt-0.5";

export const spectrumCsvMenuItemClass =
  "text-foreground hover:bg-default/90 focus-visible:ring-accent flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-45";

export const spectrumCsvMenuDisabledItemClass =
  "text-muted bg-[color-mix(in_oklab,var(--surface-2)_55%,transparent)] flex w-full cursor-not-allowed flex-col items-start gap-0.5 rounded-xl border border-[color-mix(in_oklab,var(--border-default)_70%,transparent)] px-3 py-2.5 text-left opacity-75";
