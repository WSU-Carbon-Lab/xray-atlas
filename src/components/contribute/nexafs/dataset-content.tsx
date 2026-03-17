"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { skipToken } from "@tanstack/react-query";
import { PencilIcon } from "@heroicons/react/24/outline";
import {
  ChevronDown,
  ClipboardPaste,
  Columns3,
  Copy,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Accordion, Button, Checkbox, Chip, Tooltip } from "@heroui/react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
} from "@heroui/dropdown";
import { Pagination } from "@heroui/pagination";
import { SpectrumPlot } from "~/components/plots/spectrum-plot";
import type { SpectrumSelection } from "~/components/plots/types";
import { AnalysisToolbar, type AnalysisToolId } from "./analysis-toolbar";
import { AddMoleculeModal } from "./add-molecule-modal";
import { AddFacilityModal } from "./add-facility-modal";
import { SampleInformationSection } from "./sample-information-section";
import {
  VisualizationToggle,
  type VisualizationMode,
  type GraphStyle,
} from "./visualization-toggle";
import { trpc } from "~/trpc/client";
import { useMoleculeSearch } from "~/app/contribute/nexafs/hooks/useMoleculeSearch";
import type { MoleculeSearchResult } from "~/app/contribute/nexafs/types";
import { calculateBareAtomAbsorption } from "~/app/contribute/nexafs/utils/bareAtomCalculation";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  extractAtomsFromFormula,
} from "~/app/contribute/nexafs/utils";
import type { DatasetState, PeakData } from "~/app/contribute/nexafs/types";
import type { DifferenceSpectrum } from "~/app/contribute/nexafs/utils/differenceSpectra";
import type { CursorMode } from "~/components/plots/visx/CursorModeSelector";
import { showToast } from "~/components/ui/toast";
import { SimpleDialog } from "~/components/ui/dialog";
import { DefaultButton as DialogButton } from "~/components/ui/button";

type SpectrumPoint = DatasetState["spectrumPoints"][number];

function spectrumRowsToCsv(rows: SpectrumPoint[]): string {
  const header = "Energy (eV),mu,theta,phi";
  const escape = (v: string) =>
    /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const lines = rows.map((p) =>
    [
      p.energy.toFixed(4),
      p.absorption.toExponential(6),
      typeof p.theta === "number" ? p.theta.toFixed(2) : "",
      typeof p.phi === "number" ? p.phi.toFixed(2) : "",
    ]
      .map(escape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function parsePastedSpectrumText(text: string): {
  points: SpectrumPoint[];
  error?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) return { points: [], error: "Empty input" };
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { points: [], error: "No rows" };
  const sep = trimmed.includes("\t") ? "\t" : ",";
  const firstRow = lines[0]!.split(sep).map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstRow.some((c) => c.includes("energy") || c === "ev") ||
    firstRow.some(
      (c) => c.includes("mu") || c.includes("absorption") || c === "abs",
    ) ||
    firstRow.some((c) => c.includes("theta")) ||
    firstRow.some((c) => c.includes("phi"));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const parseNum = (s: string): number => parseFloat(String(s).trim());
  const points: SpectrumPoint[] = [];
  let energyIdx = 0;
  let absorptionIdx = 1;
  let thetaIdx = -1;
  let phiIdx = -1;
  if (hasHeader && lines[0]) {
    const headers = lines[0].split(sep).map((c) => c.trim().toLowerCase());
    energyIdx = headers.findIndex(
      (h) => h.includes("energy") || h === "ev" || h === "energy (ev)",
    );
    if (energyIdx < 0) energyIdx = 0;
    absorptionIdx = headers.findIndex(
      (h) =>
        h === "mu" ||
        h.includes("absorption") ||
        h === "abs" ||
        h.includes("intensity"),
    );
    if (absorptionIdx < 0) absorptionIdx = 1;
    thetaIdx = headers.findIndex((h) => h.includes("theta"));
    phiIdx = headers.findIndex((h) => h.includes("phi"));
  }
  for (const line of dataLines) {
    const cells = line.split(sep).map((c) => c.trim());
    const energy = parseNum(cells[energyIdx] ?? "NaN");
    const absorption = parseNum(cells[absorptionIdx] ?? "NaN");
    if (!Number.isFinite(energy) || !Number.isFinite(absorption)) continue;
    const point: SpectrumPoint = { energy, absorption };
    if (thetaIdx >= 0 && cells[thetaIdx]) {
      const t = parseNum(cells[thetaIdx]!);
      if (Number.isFinite(t)) point.theta = t;
    }
    if (phiIdx >= 0 && cells[phiIdx]) {
      const p = parseNum(cells[phiIdx]!);
      if (Number.isFinite(p)) point.phi = p;
    }
    points.push(point);
  }
  if (points.length === 0)
    return {
      points: [],
      error: "No valid rows (need numeric energy and mu/absorption)",
    };
  return { points };
}

type SortColumn = "energy" | "absorption" | "theta" | "phi";

type SortDirection = "asc" | "desc";

const THETA_PHI_CHIP_COLORS = [
  "accent",
  "success",
  "warning",
  "danger",
  "default",
] as const;

type ThetaPhiChipColor = (typeof THETA_PHI_CHIP_COLORS)[number];

const SPECTRUM_TABLE_PAGE_SIZE = 10;

type SpectrumTableColumnId = "energy" | "mu" | "theta" | "phi";

const SPECTRUM_TABLE_COLUMNS: { id: SpectrumTableColumnId; label: string }[] = [
  { id: "energy", label: "Energy (eV)" },
  { id: "mu", label: "mu" },
  { id: "theta", label: "theta" },
  { id: "phi", label: "phi" },
];

const DEFAULT_VISIBLE_COLUMNS: Record<SpectrumTableColumnId, boolean> = {
  energy: true,
  mu: true,
  theta: true,
  phi: true,
};

function chipColorForIndex(index: number): ThetaPhiChipColor {
  return (
    THETA_PHI_CHIP_COLORS[index % THETA_PHI_CHIP_COLORS.length] ?? "accent"
  );
}

interface GeometrySpectrumTableBlockProps {
  keyStr: string;
  theta: number | undefined;
  phi: number | undefined;
  rows: SpectrumPoint[];
  groupPage: Record<string, number>;
  setGroupPage: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  visibleColumns: Record<SpectrumTableColumnId, boolean>;
  toggleColumn: (id: SpectrumTableColumnId) => void;
  visibleColumnList: { id: SpectrumTableColumnId; label: string }[];
  hasTheta: boolean;
  hasPhi: boolean;
  thetaColorByValue: Map<number, ThetaPhiChipColor>;
  phiColorByValue: Map<number, ThetaPhiChipColor>;
  tableClassNames: { table: string };
  onCopyCsv: (rows: SpectrumPoint[]) => void;
  editMode?: boolean;
  onReplacePoint?: (oldPoint: SpectrumPoint, newPoint: SpectrumPoint) => void;
}

function GeometrySpectrumTableBlock({
  keyStr,
  theta,
  phi,
  rows,
  groupPage,
  setGroupPage,
  visibleColumns,
  toggleColumn,
  visibleColumnList,
  hasTheta,
  hasPhi,
  thetaColorByValue,
  phiColorByValue,
  tableClassNames,
  onCopyCsv,
  editMode = false,
  onReplacePoint,
}: GeometrySpectrumTableBlockProps) {
  const pageIndex = groupPage[keyStr] ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / SPECTRUM_TABLE_PAGE_SIZE),
  );
  const start =
    rows.length === 0 ? 0 : pageIndex * SPECTRUM_TABLE_PAGE_SIZE + 1;
  const end = Math.min((pageIndex + 1) * SPECTRUM_TABLE_PAGE_SIZE, rows.length);
  const pageRows = rows.slice(
    pageIndex * SPECTRUM_TABLE_PAGE_SIZE,
    (pageIndex + 1) * SPECTRUM_TABLE_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tooltip delay={0}>
          <Dropdown>
            <DropdownTrigger>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                <Columns3 className="size-3.5" />
                Columns
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Toggle table columns"
              closeOnSelect={false}
              className="min-w-[180px]"
            >
              <DropdownSection title="Show columns">
                {SPECTRUM_TABLE_COLUMNS.map(({ id, label }) => (
                  <DropdownItem
                    key={id}
                    textValue={label}
                    className="cursor-default py-1.5"
                    onAction={() => {}}
                  >
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        isSelected={visibleColumns[id]}
                        onChange={() => toggleColumn(id)}
                        className="[&_[data-slot=checkbox-content]]:text-xs [&_[data-slot=checkbox-content]]:text-[var(--text-primary)]"
                      >
                        {label}
                      </Checkbox>
                    </div>
                  </DropdownItem>
                ))}
              </DropdownSection>
            </DropdownMenu>
          </Dropdown>
          <Tooltip.Content
            placement="top"
            className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100"
          >
            Show or hide table columns
          </Tooltip.Content>
        </Tooltip>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-xs font-medium text-[var(--text-secondary)]"
          onPress={() => onCopyCsv(rows)}
        >
          <Copy className="size-3.5" />
          Copy as CSV
        </Button>
      </div>
      {visibleColumnList.length === 0 ? (
        <p className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-6 text-center text-xs text-[var(--text-tertiary)]">
          Show at least one column above to view the table.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)]">
          <Table
            aria-label={`Spectrum table theta ${theta ?? "—"} phi ${phi ?? "—"}`}
            removeWrapper
            classNames={tableClassNames}
          >
            <TableHeader>
              {visibleColumnList.map((c) => (
                <TableColumn key={c.id}>{c.label}</TableColumn>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.map((point, index) => (
                <TableRow
                  key={`${point.energy}-${index}-${String(point.theta)}-${String(point.phi)}`}
                >
                  {visibleColumnList.map((col) => {
                    const canEdit =
                      editMode &&
                      onReplacePoint &&
                      (col.id === "energy" ||
                        col.id === "mu" ||
                        col.id === "theta" ||
                        col.id === "phi");
                    switch (col.id) {
                      case "energy":
                        return (
                          <TableCell
                            key={col.id}
                            className="text-right text-[var(--text-primary)]"
                          >
                            {canEdit ? (
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={point.energy}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (Number.isFinite(v))
                                    onReplacePoint(point, {
                                      ...point,
                                      energy: v,
                                    });
                                }}
                                className="w-20 rounded border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-right text-sm tabular-nums"
                              />
                            ) : (
                              point.energy.toFixed(2)
                            )}
                          </TableCell>
                        );
                      case "mu":
                        return (
                          <TableCell
                            key={col.id}
                            className="text-right text-[var(--text-primary)]"
                          >
                            {canEdit ? (
                              <input
                                type="number"
                                step="any"
                                defaultValue={point.absorption}
                                onBlur={(e) => {
                                  const v = parseFloat(e.target.value);
                                  if (Number.isFinite(v))
                                    onReplacePoint(point, {
                                      ...point,
                                      absorption: v,
                                    });
                                }}
                                className="w-24 rounded border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-right text-sm tabular-nums"
                              />
                            ) : (
                              point.absorption.toExponential(3)
                            )}
                          </TableCell>
                        );
                      case "theta":
                        return (
                          <TableCell key={col.id} className="text-right">
                            {canEdit ? (
                              <input
                                type="number"
                                step="0.1"
                                defaultValue={
                                  typeof point.theta === "number"
                                    ? point.theta
                                    : ""
                                }
                                onBlur={(e) => {
                                  const s = e.target.value.trim();
                                  const v =
                                    s === "" ? undefined : parseFloat(s);
                                  onReplacePoint(point, {
                                    ...point,
                                    theta:
                                      v !== undefined && Number.isFinite(v)
                                        ? v
                                        : undefined,
                                  });
                                }}
                                className="w-16 rounded border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-right text-sm tabular-nums"
                              />
                            ) : (
                              <span className="flex justify-end">
                                {hasTheta && typeof point.theta === "number" ? (
                                  <Chip
                                    color={
                                      thetaColorByValue.get(point.theta) ??
                                      "accent"
                                    }
                                    size="sm"
                                    variant="soft"
                                  >
                                    {point.theta.toFixed(1)}
                                  </Chip>
                                ) : (
                                  <span className="text-[var(--text-tertiary)]">
                                    —
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                        );
                      case "phi":
                        return (
                          <TableCell key={col.id} className="text-right">
                            {canEdit ? (
                              <input
                                type="number"
                                step="0.1"
                                defaultValue={
                                  typeof point.phi === "number" ? point.phi : ""
                                }
                                onBlur={(e) => {
                                  const s = e.target.value.trim();
                                  const v =
                                    s === "" ? undefined : parseFloat(s);
                                  onReplacePoint(point, {
                                    ...point,
                                    phi:
                                      v !== undefined && Number.isFinite(v)
                                        ? v
                                        : undefined,
                                  });
                                }}
                                className="w-16 rounded border border-[var(--border-default)] bg-[var(--surface-1)] px-2 py-1 text-right text-sm tabular-nums"
                              />
                            ) : (
                              <span className="flex justify-end">
                                {hasPhi && typeof point.phi === "number" ? (
                                  <Chip
                                    color={
                                      phiColorByValue.get(point.phi) ?? "accent"
                                    }
                                    size="sm"
                                    variant="soft"
                                  >
                                    {point.phi.toFixed(1)}
                                  </Chip>
                                ) : (
                                  <span className="text-[var(--text-tertiary)]">
                                    —
                                  </span>
                                )}
                              </span>
                            )}
                          </TableCell>
                        );
                    }
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3">
            <span className="text-xs text-[var(--text-tertiary)]">
              {rows.length === 0
                ? "0 results"
                : `${start} to ${end} of ${rows.length} results`}
            </span>
            <Pagination
              total={totalPages}
              page={pageIndex + 1}
              onChange={(p) =>
                setGroupPage((prev) => ({ ...prev, [keyStr]: p - 1 }))
              }
              showControls
              size="sm"
              classNames={{
                base: "gap-1",
                item: "rounded-md border border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)]",
                cursor: "bg-accent text-accent-foreground border-accent",
                prev: "rounded-md border border-[var(--border-default)] bg-[var(--surface-1)]",
                next: "rounded-md border border-[var(--border-default)] bg-[var(--surface-1)]",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface DatasetSpectrumTableProps {
  points: SpectrumPoint[];
  uniqueThetaValues: number[];
  uniquePhiValues: number[];
  editMode?: boolean;
  onDeleteGeometry?: (
    theta: number | undefined,
    phi: number | undefined,
    pointCount: number,
  ) => void;
  onPasteGeometries?: () => void;
  onReplacePoint?: (oldPoint: SpectrumPoint, newPoint: SpectrumPoint) => void;
}

function DatasetSpectrumTable({
  points,
  uniqueThetaValues,
  uniquePhiValues,
  editMode = false,
  onDeleteGeometry,
  onPasteGeometries,
  onReplacePoint,
}: DatasetSpectrumTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("energy");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [groupPage, setGroupPage] = useState<Record<string, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<
    Record<SpectrumTableColumnId, boolean>
  >(DEFAULT_VISIBLE_COLUMNS);

  const hasTheta = points.some((p) => typeof p.theta === "number");
  const hasPhi = points.some((p) => typeof p.phi === "number");

  const sortedPoints = useMemo(() => {
    const copy = [...points];
    const direction = sortDirection === "asc" ? 1 : -1;

    return copy.sort((a, b) => {
      const aValue =
        sortColumn === "energy"
          ? a.energy
          : sortColumn === "absorption"
            ? a.absorption
            : sortColumn === "theta"
              ? typeof a.theta === "number"
                ? a.theta
                : Number.NaN
              : typeof a.phi === "number"
                ? a.phi
                : Number.NaN;
      const bValue =
        sortColumn === "energy"
          ? b.energy
          : sortColumn === "absorption"
            ? b.absorption
            : sortColumn === "theta"
              ? typeof b.theta === "number"
                ? b.theta
                : Number.NaN
              : typeof b.phi === "number"
                ? b.phi
                : Number.NaN;

      if (Number.isNaN(aValue) && Number.isNaN(bValue)) return 0;
      if (Number.isNaN(aValue)) return 1;
      if (Number.isNaN(bValue)) return -1;
      if (aValue === bValue) return 0;
      return aValue > bValue ? direction : -direction;
    });
  }, [points, sortColumn, sortDirection]);

  type GroupKey = { theta: number | undefined; phi: number | undefined };
  const groups = useMemo(() => {
    const map = new Map<string, { key: GroupKey; rows: SpectrumPoint[] }>();
    for (const p of sortedPoints) {
      const theta =
        hasTheta && typeof p.theta === "number" ? p.theta : undefined;
      const phi = hasPhi && typeof p.phi === "number" ? p.phi : undefined;
      const keyStr = `theta-${theta ?? "none"}-phi-${phi ?? "none"}`;
      const existing = map.get(keyStr);
      if (existing) existing.rows.push(p);
      else map.set(keyStr, { key: { theta, phi }, rows: [p] });
    }
    const list = Array.from(map.entries()).map(([keyStr, { key, rows }]) => {
      const energies = rows.map((r) => r.energy);
      const minEnergy =
        energies.length > 0 ? Math.min(...energies) : Number.NaN;
      const maxEnergy =
        energies.length > 0 ? Math.max(...energies) : Number.NaN;
      return {
        keyStr,
        theta: key.theta,
        phi: key.phi,
        rows,
        minEnergy,
        maxEnergy,
      };
    });
    list.sort((a, b) => {
      const at = a.theta ?? Number.NaN;
      const bt = b.theta ?? Number.NaN;
      if (!Number.isNaN(at) && !Number.isNaN(bt) && at !== bt) return at - bt;
      if (Number.isNaN(at) && !Number.isNaN(bt)) return 1;
      if (!Number.isNaN(at) && Number.isNaN(bt)) return -1;
      const ap = a.phi ?? Number.NaN;
      const bp = b.phi ?? Number.NaN;
      if (!Number.isNaN(ap) && !Number.isNaN(bp) && ap !== bp) return ap - bp;
      if (Number.isNaN(ap) && !Number.isNaN(bp)) return 1;
      if (!Number.isNaN(ap) && Number.isNaN(bp)) return -1;
      return 0;
    });
    return list;
  }, [sortedPoints, hasTheta, hasPhi]);

  const thetaColorByValue = useMemo(() => {
    const map = new Map<number, ThetaPhiChipColor>();
    uniqueThetaValues.forEach((v, i) => map.set(v, chipColorForIndex(i)));
    return map;
  }, [uniqueThetaValues]);

  const phiColorByValue = useMemo(() => {
    const map = new Map<number, ThetaPhiChipColor>();
    uniquePhiValues.forEach((v, i) => map.set(v, chipColorForIndex(i)));
    return map;
  }, [uniquePhiValues]);

  const toggleColumn = useCallback((id: SpectrumTableColumnId) => {
    setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const showColumn = useCallback(
    (id: SpectrumTableColumnId) => {
      if (!visibleColumns[id]) return false;
      if (id === "theta" && !hasTheta) return false;
      if (id === "phi" && !hasPhi) return false;
      return true;
    },
    [visibleColumns, hasTheta, hasPhi],
  );

  const tableClassNames = {
    table:
      "w-full text-sm [&_td]:whitespace-nowrap [&_td]:font-mono [&_td]:tabular-nums [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_tbody_tr]:transition-colors [&_tbody_tr:nth-child(odd)]:bg-[var(--surface-2)] [&_tbody_tr:nth-child(even)]:bg-[var(--surface-3)] [&_tbody_tr:hover]:bg-[var(--surface-3)] [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-[var(--z-sticky)] [&_thead]:bg-[var(--surface-2)] [&_thead_th]:bg-[var(--surface-2)] [&_thead_th]:text-right [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-[var(--text-secondary)] [&_thead_th]:border-b [&_thead_th]:border-[var(--border-default)] [&_thead_th]:shadow-[0_1px_0_0_var(--border-default)]",
  };

  const visibleColumnList = useMemo(
    () => SPECTRUM_TABLE_COLUMNS.filter((c) => showColumn(c.id)),
    [showColumn],
  );

  const handleCopyCsv = useCallback((rows: SpectrumPoint[]) => {
    const csv = spectrumRowsToCsv(rows);
    void navigator.clipboard.writeText(csv).then(() => {
      showToast(`Copied ${rows.length} rows as CSV`, "success");
    });
  }, []);

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
      <Accordion
        defaultExpandedKeys={[]}
        variant="surface"
        className="w-full rounded-xl"
      >
        {groups.map(({ keyStr, theta, phi, rows, minEnergy, maxEnergy }) => {
          const energyRangeStr =
            !Number.isNaN(minEnergy) && !Number.isNaN(maxEnergy)
              ? `${minEnergy.toFixed(1)} – ${maxEnergy.toFixed(1)} eV`
              : "—";
          return (
            <Accordion.Item
              key={keyStr}
              id={keyStr}
              className="rounded-lg first:rounded-t-xl last:rounded-b-xl [&+&]:mt-2"
            >
              <Accordion.Heading>
                <Accordion.Trigger className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-lg px-5 py-3.5 text-left">
                  <span className="flex shrink-0 items-center gap-2">
                    {hasTheta && theta !== undefined ? (
                      <Chip
                        color={thetaColorByValue.get(theta) ?? "accent"}
                        size="sm"
                        variant="soft"
                      >
                        {theta.toFixed(1)}
                      </Chip>
                    ) : null}
                    {hasPhi && phi !== undefined ? (
                      <Chip
                        color={phiColorByValue.get(phi) ?? "accent"}
                        size="sm"
                        variant="soft"
                      >
                        {phi.toFixed(1)}
                      </Chip>
                    ) : null}
                    {!hasTheta && !hasPhi ? (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    ) : null}
                    <span className="text-[var(--text-tertiary)]">
                      {energyRangeStr}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {onDeleteGeometry && (
                      <Tooltip delay={0}>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteGeometry(theta, phi, rows.length);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              onDeleteGeometry(theta, phi, rows.length);
                            }
                          }}
                          className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-[var(--text-tertiary)] transition-colors hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                          aria-label="Remove this geometry"
                        >
                          <Trash2 className="size-4" />
                        </span>
                        <Tooltip.Content className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100">
                          Remove this geometry ({rows.length} points)
                        </Tooltip.Content>
                      </Tooltip>
                    )}
                    <Accordion.Indicator>
                      <ChevronDown className="size-4" />
                    </Accordion.Indicator>
                  </span>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body>
                  <GeometrySpectrumTableBlock
                    keyStr={keyStr}
                    theta={theta}
                    phi={phi}
                    rows={rows}
                    groupPage={groupPage}
                    setGroupPage={setGroupPage}
                    visibleColumns={visibleColumns}
                    toggleColumn={toggleColumn}
                    visibleColumnList={visibleColumnList}
                    hasTheta={hasTheta}
                    hasPhi={hasPhi}
                    thetaColorByValue={thetaColorByValue}
                    phiColorByValue={phiColorByValue}
                    tableClassNames={tableClassNames}
                    onCopyCsv={handleCopyCsv}
                    editMode={editMode}
                    onReplacePoint={
                      onReplacePoint
                        ? (oldPoint, newPoint) =>
                            onReplacePoint(oldPoint, newPoint)
                        : undefined
                    }
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
      {onPasteGeometries && (
        <div className="mt-4 flex items-center justify-end border-t border-[var(--border-default)] pt-3">
          <Tooltip delay={0}>
            <Button
              size="sm"
              variant="secondary"
              onPress={onPasteGeometries}
              className="gap-2"
            >
              <ClipboardPaste className="size-4" />
              Add geometry
            </Button>
            <Tooltip.Content className="rounded-lg bg-gray-900 px-3 py-2 text-white shadow-lg dark:bg-gray-700 dark:text-gray-100">
              Add geometry from CSV or tab-separated data (Energy, mu, theta,
              phi) from clipboard
            </Tooltip.Content>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

interface DatasetContentProps {
  dataset: DatasetState;
  onDatasetUpdate: (datasetId: string, updates: Partial<DatasetState>) => void;
  onReloadData?: () => void;
  instrumentOptions: Array<{ id: string; name: string; facilityName?: string }>;
  edgeOptions: Array<{ id: string; targetatom: string; corestate: string }>;
  calibrationOptions: Array<{ id: string; name: string }>;
  vendors: Array<{ id: string; name: string }>;
  isLoadingInstruments: boolean;
  isLoadingEdges: boolean;
  isLoadingCalibrations: boolean;
  isLoadingVendors: boolean;
}

export function DatasetContent({
  dataset,
  onDatasetUpdate,
  onReloadData,
  instrumentOptions,
  edgeOptions,
  calibrationOptions: _calibrationOptions,
  vendors,
  isLoadingInstruments: _isLoadingInstruments,
  isLoadingEdges: _isLoadingEdges,
  isLoadingCalibrations: _isLoadingCalibrations,
  isLoadingVendors,
}: DatasetContentProps) {
  const [showAddMoleculeModal, setShowAddMoleculeModal] = useState(false);
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [isCalculatingBareAtom, setIsCalculatingBareAtom] = useState(false);
  const [bareAtomError, setBareAtomError] = useState<string | null>(null);
  const [normalizationSelectionTarget, setNormalizationSelectionTarget] =
    useState<"pre" | "post" | null>(null);
  const [isManualPeakMode, setIsManualPeakMode] = useState(false);
  const [differenceSpectra, setDifferenceSpectra] = useState<
    DifferenceSpectrum[]
  >([]);
  const [showThetaData, setShowThetaData] = useState(false);
  const [showPhiData, setShowPhiData] = useState(false);
  const [selectedGeometry, setSelectedGeometry] = useState<{
    theta?: number;
    phi?: number;
  } | null>(null);
  const [visualizationMode, setVisualizationMode] =
    useState<VisualizationMode>("table");
  const [graphStyle, setGraphStyle] = useState<GraphStyle>("line");
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [selectedAnalysisTool, setSelectedAnalysisTool] =
    useState<AnalysisToolId>("config");
  const [cursorMode, setCursorMode] = useState<CursorMode>("inspect");
  const [geometryEditMode, setGeometryEditMode] = useState(false);
  const [deleteConfirmGeometry, setDeleteConfirmGeometry] = useState<{
    theta: number | undefined;
    phi: number | undefined;
    pointCount: number;
  } | null>(null);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [pasteDialogText, setPasteDialogText] = useState("");

  const handleDeleteGeometry = useCallback(
    (
      theta: number | undefined,
      phi: number | undefined,
      pointCount: number,
    ) => {
      setDeleteConfirmGeometry({ theta, phi, pointCount });
    },
    [],
  );

  const confirmDeleteGeometry = useCallback(() => {
    if (!deleteConfirmGeometry) return;
    const { theta, phi } = deleteConfirmGeometry;
    const next = dataset.spectrumPoints.filter((p) => {
      const matchTheta =
        theta === undefined
          ? typeof p.theta !== "number"
          : typeof p.theta === "number" && p.theta === theta;
      const matchPhi =
        phi === undefined
          ? typeof p.phi !== "number"
          : typeof p.phi === "number" && p.phi === phi;
      return !(matchTheta && matchPhi);
    });
    onDatasetUpdate(dataset.id, { spectrumPoints: next });
    showToast("Geometry removed", "success");
    setDeleteConfirmGeometry(null);
  }, [
    deleteConfirmGeometry,
    dataset.id,
    dataset.spectrumPoints,
    onDatasetUpdate,
  ]);

  const handlePasteGeometries = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const result = parsePastedSpectrumText(text);
      if (result.error) {
        setPasteDialogText(text);
        setPasteDialogOpen(true);
        return;
      }
      const next = [...dataset.spectrumPoints, ...result.points];
      onDatasetUpdate(dataset.id, { spectrumPoints: next });
      showToast(`Added ${result.points.length} points`, "success");
    } catch {
      setPasteDialogText("");
      setPasteDialogOpen(true);
    }
  }, [dataset.id, dataset.spectrumPoints, onDatasetUpdate]);

  const handlePasteFromDialog = useCallback(() => {
    const result = parsePastedSpectrumText(pasteDialogText);
    if (result.error) {
      showToast(result.error, "error");
      return;
    }
    const next = [...dataset.spectrumPoints, ...result.points];
    onDatasetUpdate(dataset.id, { spectrumPoints: next });
    showToast(`Added ${result.points.length} points`, "success");
    setPasteDialogOpen(false);
    setPasteDialogText("");
  }, [pasteDialogText, dataset.id, dataset.spectrumPoints, onDatasetUpdate]);

  const handleReplacePoint = useCallback(
    (oldPoint: SpectrumPoint, newPoint: SpectrumPoint) => {
      const idx = dataset.spectrumPoints.findIndex(
        (p) =>
          p.energy === oldPoint.energy &&
          p.absorption === oldPoint.absorption &&
          (p.theta ?? undefined) === (oldPoint.theta ?? undefined) &&
          (p.phi ?? undefined) === (oldPoint.phi ?? undefined),
      );
      if (idx < 0) return;
      const next = [...dataset.spectrumPoints];
      next[idx] = newPoint;
      onDatasetUpdate(dataset.id, { spectrumPoints: next });
    },
    [dataset.id, dataset.spectrumPoints, onDatasetUpdate],
  );

  // Molecule search hook - per dataset
  const {
    searchTerm,
    setSearchTerm,
    suggestions,
    manualResults,
    suggestionError,
    manualError,
    isSuggesting,
    isManualSearching,
    runManualSearch,
    selectedMolecule,
    selectedPreferredName,
    setSelectedPreferredName,
    allMoleculeNames,
    selectMolecule,
  } = useMoleculeSearch({
    onSelectionChange: (molecule) => {
      if (molecule?.id) {
        onDatasetUpdate(dataset.id, { moleculeId: molecule.id });
      } else {
        onDatasetUpdate(dataset.id, { moleculeId: null });
      }
    },
  });

  // Sync molecule selection with dataset - fetch molecule if ID is set but molecule not loaded
  const moleculeQuery = trpc.molecules.getById.useQuery(
    dataset.moleculeId ? { id: dataset.moleculeId } : skipToken,
    {
      enabled:
        !!dataset.moleculeId && selectedMolecule?.id !== dataset.moleculeId,
    },
  );

  useEffect(() => {
    if (moleculeQuery.data && selectedMolecule?.id !== moleculeQuery.data.id) {
      const molecule: MoleculeSearchResult = {
        id: moleculeQuery.data.id,
        iupacName: moleculeQuery.data.iupacName,
        commonName:
          moleculeQuery.data.commonName?.[0] ?? moleculeQuery.data.iupacName,
        synonyms: moleculeQuery.data.commonName ?? [],
        inchi: moleculeQuery.data.InChI,
        smiles: moleculeQuery.data.SMILES,
        chemicalFormula: moleculeQuery.data.chemicalFormula,
        casNumber: moleculeQuery.data.casNumber ?? null,
        pubChemCid: moleculeQuery.data.pubChemCid ?? null,
        imageUrl: moleculeQuery.data.imageUrl ?? undefined,
      };
      selectMolecule(molecule);
    }
  }, [moleculeQuery.data, selectedMolecule, selectMolecule]);

  // Extract atoms from selected molecule's chemical formula
  const moleculeAtoms = useMemo(() => {
    return selectedMolecule?.chemicalFormula
      ? extractAtomsFromFormula(selectedMolecule.chemicalFormula)
      : new Set<string>();
  }, [selectedMolecule?.chemicalFormula]);

  // Filter edge options to only show edges for atoms present in the molecule
  const availableEdgeOptions = useMemo(() => {
    if (moleculeAtoms.size === 0 || !dataset.moleculeLocked) {
      return edgeOptions;
    }

    return edgeOptions.filter((edge) =>
      moleculeAtoms.has(edge.targetatom.toUpperCase()),
    );
  }, [edgeOptions, moleculeAtoms, dataset.moleculeLocked]);

  // Check if current edge selection matches molecule atoms
  const selectedEdge = edgeOptions.find((e) => e.id === dataset.edgeId);
  const edgeAtomMatches =
    !selectedMolecule ||
    !selectedEdge ||
    moleculeAtoms.has(selectedEdge.targetatom.toUpperCase());

  // Clear edge selection if molecule is locked and edge doesn't match
  useEffect(() => {
    if (
      dataset.moleculeLocked &&
      selectedMolecule &&
      selectedEdge &&
      !edgeAtomMatches
    ) {
      onDatasetUpdate(dataset.id, { edgeId: "" });
    }
  }, [
    dataset.moleculeLocked,
    selectedMolecule,
    selectedEdge,
    edgeAtomMatches,
    dataset.id,
    onDatasetUpdate,
  ]);

  // Calculate bare atom absorption when molecule is selected
  useEffect(() => {
    if (
      selectedMolecule?.chemicalFormula &&
      dataset.spectrumPoints.length > 0
    ) {
      // Only recalculate if bare atom points don't exist
      // Note: We always recalculate when molecule changes since BareAtomPoint doesn't store the formula
      const needsRecalculation =
        !dataset.bareAtomPoints || dataset.bareAtomPoints.length === 0;

      if (needsRecalculation) {
        setIsCalculatingBareAtom(true);
        setBareAtomError(null);

        calculateBareAtomAbsorption(
          selectedMolecule.chemicalFormula,
          dataset.spectrumPoints,
        )
          .then((points) => {
            onDatasetUpdate(dataset.id, { bareAtomPoints: points });
            setIsCalculatingBareAtom(false);
          })
          .catch((error) => {
            console.error("Failed to calculate bare atom absorption:", error);
            setBareAtomError(
              error instanceof Error ? error.message : "Calculation failed",
            );
            setIsCalculatingBareAtom(false);
          });
      }
    } else if (!selectedMolecule && dataset.bareAtomPoints) {
      onDatasetUpdate(dataset.id, { bareAtomPoints: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedMolecule?.chemicalFormula,
    dataset.spectrumPoints.length,
    dataset.id,
  ]);

  const bareAtomPointsLength = dataset.bareAtomPoints?.length;
  const spectrumPointsLength = dataset.spectrumPoints.length;
  const pre0 = dataset.normalizationRegions.pre?.[0];
  const pre1 = dataset.normalizationRegions.pre?.[1];
  const post0 = dataset.normalizationRegions.post?.[0];
  const post1 = dataset.normalizationRegions.post?.[1];
  const normalizationType = dataset.normalizationType;
  const datasetId = dataset.id;

  useEffect(() => {
    if (
      dataset.spectrumPoints.length > 0 &&
      dataset.normalizationRegions.pre &&
      dataset.normalizationRegions.post
    ) {
      const preRange = dataset.normalizationRegions.pre;
      const postRange = dataset.normalizationRegions.post;

      let result: ReturnType<typeof computeNormalizationForExperiment> | null =
        null;

      if (dataset.normalizationType === "bare-atom") {
        // Bare atom normalization requires bare atom points
        if (dataset.bareAtomPoints && dataset.bareAtomPoints.length > 0) {
          // Count points in each range
          const preCount = dataset.spectrumPoints.filter(
            (p) => p.energy >= preRange[0] && p.energy <= preRange[1],
          ).length;
          const postCount = dataset.spectrumPoints.filter(
            (p) => p.energy >= postRange[0] && p.energy <= postRange[1],
          ).length;

          if (preCount > 0 && postCount > 0) {
            result = computeNormalizationForExperiment(
              dataset.spectrumPoints,
              dataset.bareAtomPoints,
              preCount,
              postCount,
            );
          }
        }
      } else {
        // Zero-one normalization
        result = computeZeroOneNormalization(
          dataset.spectrumPoints,
          preRange,
          postRange,
        );
      }

      if (result) {
        // Only update if normalization actually changed
        const currentNormalization = dataset.normalization;
        const needsUpdate =
          currentNormalization?.scale !== result.scale ||
          currentNormalization?.offset !== result.offset ||
          currentNormalization.preRange?.[0] !== result.preRange?.[0] ||
          currentNormalization.preRange?.[1] !== result.preRange?.[1] ||
          currentNormalization.postRange?.[0] !== result.postRange?.[0] ||
          currentNormalization.postRange?.[1] !== result.postRange?.[1];

        if (needsUpdate) {
          onDatasetUpdate(dataset.id, {
            normalizedPoints: result.normalizedPoints,
            normalization: {
              scale: result.scale,
              offset: result.offset,
              preRange: result.preRange,
              postRange: result.postRange,
            },
          });
        }
      } else {
        // Clear normalization if it cannot be computed
        // This happens when switching to bare-atom without bare atom points,
        // or when zero-one normalization fails
        if (
          dataset.normalizedPoints !== null ||
          dataset.normalization !== null
        ) {
          onDatasetUpdate(dataset.id, {
            normalizedPoints: null,
            normalization: null,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extracted deps; full deps would cause unnecessary reruns
  }, [
    bareAtomPointsLength,
    spectrumPointsLength,
    pre0,
    pre1,
    post0,
    post1,
    normalizationType,
    datasetId,
  ]);

  const handleMoleculeCreated = (_moleculeId: string) => {
    setShowAddMoleculeModal(false);
    // The molecule selector should refresh and select the new molecule
    // For now, we'll just close the modal - the user can search for it
  };

  const handleFacilityCreated = (facilityId: string, instrumentId: string) => {
    setShowAddFacilityModal(false);
    onDatasetUpdate(dataset.id, { instrumentId });
  };

  const handleNormalizationSelection = (
    selection: SpectrumSelection | null,
  ) => {
    if (!selection || !normalizationSelectionTarget) return;

    const range: [number, number] = [
      Math.min(selection.energyMin, selection.energyMax),
      Math.max(selection.energyMin, selection.energyMax),
    ];

    if (normalizationSelectionTarget === "pre") {
      onDatasetUpdate(dataset.id, {
        normalizationRegions: {
          ...dataset.normalizationRegions,
          pre: range,
        },
      });
    } else {
      onDatasetUpdate(dataset.id, {
        normalizationRegions: {
          ...dataset.normalizationRegions,
          post: range,
        },
      });
    }

    setNormalizationSelectionTarget(null);
  };

  const handleToggleLock = () => {
    onDatasetUpdate(dataset.id, {
      normalizationLocked: !dataset.normalizationLocked,
    });
  };

  const handleToggleMoleculeLock = () => {
    onDatasetUpdate(dataset.id, {
      moleculeLocked: !dataset.moleculeLocked,
    });
  };

  // Prepare plot data
  const plotPoints = dataset.normalizedPoints ?? dataset.spectrumPoints;
  const referenceCurves = dataset.bareAtomPoints
    ? [
        {
          label: "Bare Atom Absorption",
          points: dataset.bareAtomPoints,
          color: "#6b7280",
        },
      ]
    : [];

  const normalizationRegions = dataset.normalizationLocked
    ? {
        pre: dataset.normalizationRegions.pre,
        post: dataset.normalizationRegions.post,
      }
    : undefined;

  const tableUniqueThetaValues = useMemo(() => {
    const set = new Set<number>();
    for (const p of plotPoints) {
      if (typeof p.theta === "number") set.add(p.theta);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [plotPoints]);

  const tableUniquePhiValues = useMemo(() => {
    const set = new Set<number>();
    for (const p of plotPoints) {
      if (typeof p.phi === "number") set.add(p.phi);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [plotPoints]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <div className="flex w-full shrink-0 flex-col">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 items-center">
            <Tooltip delay={0}>
              <button
                type="button"
                onClick={() => setAnalysisPanelOpen(!analysisPanelOpen)}
                className="border-border bg-surface text-foreground hover:bg-default flex h-8 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                aria-label={
                  analysisPanelOpen
                    ? "Close analysis toolbar"
                    : "Open analysis toolbar"
                }
              >
                {analysisPanelOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>
              <Tooltip.Content className="bg-foreground text-background rounded-lg px-3 py-2 shadow-lg">
                Toggles the analysis toolbar
              </Tooltip.Content>
            </Tooltip>
          </div>
          <div className="min-w-0 flex-1">
            <VisualizationToggle
              mode={visualizationMode}
              graphStyle={graphStyle}
              onModeChange={setVisualizationMode}
              onGraphStyleChange={setGraphStyle}
              showEditButton={visualizationMode === "table"}
              editMode={geometryEditMode}
              onEditModeChange={setGeometryEditMode}
            />
          </div>
        </div>
        <div className="mt-3 flex min-h-0 w-full flex-1 items-stretch gap-6 overflow-hidden">
          {analysisPanelOpen && (
            <AnalysisToolbar
              panelOnly
              selectedTool={selectedAnalysisTool}
              onSelectedToolChange={setSelectedAnalysisTool}
              hasMolecule={!!dataset.moleculeId}
              hasData={dataset.spectrumPoints.length > 0}
              hasNormalization={!!dataset.normalization}
              normalizationLocked={dataset.normalizationLocked}
              normalizationType={dataset.normalizationType}
              onNormalizationTypeChange={(type) => {
                onDatasetUpdate(dataset.id, { normalizationType: type });
              }}
              onPreEdgeSelect={() => setNormalizationSelectionTarget("pre")}
              onPostEdgeSelect={() => setNormalizationSelectionTarget("post")}
              onToggleLock={handleToggleLock}
              isSelectingPreEdge={normalizationSelectionTarget === "pre"}
              isSelectingPostEdge={normalizationSelectionTarget === "post"}
              normalizationRegions={dataset.normalizationRegions}
              onNormalizationRegionChange={(type, range) => {
                onDatasetUpdate(dataset.id, {
                  normalizationRegions: {
                    ...dataset.normalizationRegions,
                    [type]: range,
                  },
                });
              }}
              peaks={dataset.peaks.map((peak, index) => ({
                ...peak,
                id: peak.id ?? `peak-${index}-${peak.energy}`,
              }))}
              spectrumPoints={dataset.spectrumPoints}
              normalizedPoints={dataset.normalizedPoints}
              selectedPeakId={dataset.selectedPeakId}
              onPeaksChange={(peaks) => onDatasetUpdate(dataset.id, { peaks })}
              onPeakSelect={(peakId) =>
                onDatasetUpdate(dataset.id, { selectedPeakId: peakId })
              }
              onPeakUpdate={(peakId, energy) => {
                const updatedPeaks = dataset.peaks.map((peak) => {
                  const currentId =
                    peak.id ??
                    `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
                  if (currentId === peakId) {
                    return { ...peak, energy };
                  }
                  return peak;
                });
                onDatasetUpdate(dataset.id, { peaks: updatedPeaks });
              }}
              onPeakAdd={(energy) => {
                const newPeak = {
                  energy: Math.round(energy * 100) / 100,
                  id: `peak-manual-${Date.now()}`,
                } as PeakData & { id: string };
                onDatasetUpdate(dataset.id, {
                  peaks: [...dataset.peaks, newPeak],
                });
              }}
              isManualPeakMode={isManualPeakMode}
              onManualPeakModeChange={setIsManualPeakMode}
              differenceSpectra={differenceSpectra}
              onDifferenceSpectraChange={setDifferenceSpectra}
              showThetaData={showThetaData}
              showPhiData={showPhiData}
              onShowThetaDataChange={setShowThetaData}
              onShowPhiDataChange={setShowPhiData}
              selectedGeometry={selectedGeometry}
              onSelectedGeometryChange={setSelectedGeometry}
              onReloadData={onReloadData}
              moleculeId={dataset.moleculeId}
              instrumentId={dataset.instrumentId}
              edgeId={dataset.edgeId}
              onMoleculeChange={(moleculeId) =>
                onDatasetUpdate(dataset.id, { moleculeId })
              }
              onInstrumentChange={(instrumentId) =>
                onDatasetUpdate(dataset.id, { instrumentId })
              }
              onEdgeChange={(edgeId) => {
                onDatasetUpdate(dataset.id, { edgeId });
              }}
              instrumentOptions={instrumentOptions}
              edgeOptions={edgeOptions}
              availableEdgeOptions={availableEdgeOptions}
              onAddFacility={() => setShowAddFacilityModal(true)}
              moleculeSearchTerm={searchTerm}
              onMoleculeSearchTermChange={setSearchTerm}
              moleculeSuggestions={suggestions}
              moleculeManualResults={manualResults}
              moleculeSuggestionError={suggestionError}
              moleculeManualError={manualError}
              isMoleculeSuggesting={isSuggesting}
              isMoleculeManualSearching={isManualSearching}
              selectedMolecule={selectedMolecule}
              selectedMoleculePreferredName={selectedPreferredName}
              onSelectedMoleculePreferredNameChange={setSelectedPreferredName}
              allMoleculeNames={allMoleculeNames}
              onUseMolecule={(result) => selectMolecule(result)}
              onMoleculeManualSearch={runManualSearch}
              moleculeLocked={dataset.moleculeLocked}
              onToggleMoleculeLock={handleToggleMoleculeLock}
              edgeAtomMatches={edgeAtomMatches}
              selectedEdge={selectedEdge}
            />
          )}

          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <div
              className={`border-border bg-surface w-full border p-6 shadow-sm ${
                visualizationMode === "table"
                  ? "flex flex-col rounded-lg"
                  : "flex min-h-[840px] min-w-0 flex-1 flex-col rounded-xl"
              }`}
            >
              {visualizationMode === "graph" && plotPoints.length > 0 ? (
                <div
                  className="flex min-h-0 w-full min-w-0 flex-1 flex-col"
                  style={{ minHeight: 0 }}
                >
                  <SpectrumPlot
                    points={plotPoints}
                    graphStyle={graphStyle}
                    referenceCurves={referenceCurves}
                    normalizationRegions={normalizationRegions}
                    selectionTarget={normalizationSelectionTarget}
                    onSelectionChange={handleNormalizationSelection}
                    peaks={dataset.peaks.map((peak, index) => ({
                      energy: peak.energy,
                      id: peak.id ?? `peak-${index}-${peak.energy}`,
                    }))}
                    selectedPeakId={dataset.selectedPeakId}
                    onPeakSelect={(peakId) =>
                      onDatasetUpdate(dataset.id, { selectedPeakId: peakId })
                    }
                    onPeakUpdate={(peakId, energy) => {
                      const roundedEnergy = Math.round(energy * 100) / 100;
                      const updatedPeaks = dataset.peaks.map((peak) => {
                        const currentId =
                          peak.id ??
                          `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
                        if (currentId === peakId) {
                          return { ...peak, energy: roundedEnergy };
                        }
                        return peak;
                      });
                      onDatasetUpdate(dataset.id, { peaks: updatedPeaks });
                    }}
                    onPeakDelete={(peakId) => {
                      const updatedPeaks = dataset.peaks.filter((peak) => {
                        const currentId =
                          peak.id ??
                          `peak-${dataset.peaks.indexOf(peak)}-${peak.energy}`;
                        return currentId !== peakId;
                      });
                      onDatasetUpdate(dataset.id, {
                        peaks: updatedPeaks,
                        selectedPeakId:
                          dataset.selectedPeakId === peakId
                            ? null
                            : dataset.selectedPeakId,
                      });
                    }}
                    onPeakAdd={(energy) => {
                      const roundedEnergy = Math.round(energy * 100) / 100;

                      // Estimate amplitude from spectrum at this energy
                      const pointsToAnalyze =
                        dataset.normalizedPoints ?? dataset.spectrumPoints;
                      let amplitude: number | undefined;
                      if (pointsToAnalyze.length > 0) {
                        // Find closest point to estimate amplitude
                        let closestPoint = pointsToAnalyze[0];
                        let minDistance = Math.abs(
                          pointsToAnalyze[0]!.energy - roundedEnergy,
                        );
                        for (const point of pointsToAnalyze) {
                          const distance = Math.abs(
                            point.energy - roundedEnergy,
                          );
                          if (distance < minDistance) {
                            minDistance = distance;
                            closestPoint = point;
                          }
                        }
                        amplitude = closestPoint?.absorption;
                      }

                      const newPeak = {
                        energy: roundedEnergy,
                        amplitude,
                        id: `peak-manual-${Date.now()}`,
                      } as PeakData & { id: string };
                      onDatasetUpdate(dataset.id, {
                        peaks: [...dataset.peaks, newPeak],
                      });
                    }}
                    isManualPeakMode={isManualPeakMode}
                    differenceSpectra={differenceSpectra}
                    showThetaData={showThetaData}
                    showPhiData={showPhiData}
                    selectedGeometry={selectedGeometry}
                    cursorMode={cursorMode}
                    onCursorModeChange={setCursorMode}
                  />
                </div>
              ) : visualizationMode === "table" ? (
                plotPoints.length > 0 ? (
                  <DatasetSpectrumTable
                    points={plotPoints}
                    uniqueThetaValues={tableUniqueThetaValues}
                    uniquePhiValues={tableUniquePhiValues}
                    editMode={geometryEditMode}
                    onDeleteGeometry={handleDeleteGeometry}
                    onPasteGeometries={handlePasteGeometries}
                    onReplacePoint={handleReplacePoint}
                  />
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <p className="font-medium">No data available</p>
                      <p className="mt-1 text-sm">
                        Upload a CSV file to see the table
                      </p>
                    </div>
                  </div>
                )
              ) : dataset.spectrumError ? (
                <div className="flex h-[400px] items-center justify-center text-red-600 dark:text-red-400">
                  <div className="text-center">
                    <p className="font-medium">Error processing data</p>
                    <p className="mt-1 text-sm">{dataset.spectrumError}</p>
                  </div>
                </div>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <p className="font-medium">No spectrum data</p>
                    <p className="mt-1 text-sm">
                      Upload a CSV file to see the plot
                    </p>
                  </div>
                </div>
              )}
              {isCalculatingBareAtom && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Calculating bare atom absorption...
                </div>
              )}
              {bareAtomError && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {bareAtomError}
                </div>
              )}
            </div>

            {/* Selection Mode Toast */}
            {normalizationSelectionTarget && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  normalizationSelectionTarget === "pre"
                    ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  <span>
                    {normalizationSelectionTarget === "pre"
                      ? "Draw on the plot to select the pre edge region"
                      : "Draw on the plot to select the post edge region"}
                  </span>
                </div>
              </div>
            )}

            {/* Peak Drag Toast - only show when manual peak mode is active */}
            {dataset.peaks.length > 0 && isManualPeakMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                <div className="flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  <span>
                    You can drag existing peaks on the plot to adjust.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sample Information */}
      <div>
        <SampleInformationSection
          preparationDate={dataset.sampleInfo.preparationDate}
          setPreparationDate={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, preparationDate: value },
            })
          }
          processMethod={dataset.sampleInfo.processMethod}
          setProcessMethod={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, processMethod: value },
            })
          }
          substrate={dataset.sampleInfo.substrate}
          setSubstrate={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, substrate: value },
            })
          }
          solvent={dataset.sampleInfo.solvent}
          setSolvent={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, solvent: value },
            })
          }
          thickness={dataset.sampleInfo.thickness}
          setThickness={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, thickness: value },
            })
          }
          molecularWeight={dataset.sampleInfo.molecularWeight}
          setMolecularWeight={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, molecularWeight: value },
            })
          }
          selectedVendorId={dataset.sampleInfo.vendorId}
          setSelectedVendorId={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, vendorId: value },
            })
          }
          newVendorName={dataset.sampleInfo.newVendorName}
          setNewVendorName={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, newVendorName: value },
            })
          }
          newVendorUrl={dataset.sampleInfo.newVendorUrl}
          setNewVendorUrl={(value) =>
            onDatasetUpdate(dataset.id, {
              sampleInfo: { ...dataset.sampleInfo, newVendorUrl: value },
            })
          }
          vendors={vendors}
          isLoadingVendors={isLoadingVendors}
        />
      </div>
      <AddMoleculeModal
        isOpen={showAddMoleculeModal}
        onClose={() => setShowAddMoleculeModal(false)}
        onMoleculeCreated={handleMoleculeCreated}
      />
      <AddFacilityModal
        isOpen={showAddFacilityModal}
        onClose={() => setShowAddFacilityModal(false)}
        onFacilityCreated={handleFacilityCreated}
      />

      <SimpleDialog
        isOpen={!!deleteConfirmGeometry}
        onClose={() => setDeleteConfirmGeometry(null)}
        title="Remove geometry?"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {deleteConfirmGeometry
              ? `This will remove ${deleteConfirmGeometry.pointCount.toLocaleString()} point(s) for this geometry. This cannot be undone.`
              : ""}
          </p>
          <div className="flex justify-end gap-2">
            <DialogButton
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmGeometry(null)}
            >
              Cancel
            </DialogButton>
            <DialogButton
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                confirmDeleteGeometry();
              }}
            >
              Remove
            </DialogButton>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={pasteDialogOpen}
        onClose={() => {
          setPasteDialogOpen(false);
          setPasteDialogText("");
        }}
        title="Add geometry"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Add geometry from CSV or tab-separated data with columns: Energy
            (eV), mu, optional theta, optional phi. First row may be a header.
          </p>
          <textarea
            value={pasteDialogText}
            onChange={(e) => setPasteDialogText(e.target.value)}
            placeholder="Energy (eV),mu,theta,phi&#10;285.0,0.5,30,0&#10;..."
            rows={8}
            className="border-border bg-field-background text-field-foreground placeholder:text-field-placeholder w-full rounded-lg border px-3 py-2 font-mono text-sm"
            aria-label="Add geometry data"
          />
          <div className="flex justify-end gap-2">
            <DialogButton
              type="button"
              variant="outline"
              onClick={() => {
                setPasteDialogOpen(false);
                setPasteDialogText("");
              }}
            >
              Cancel
            </DialogButton>
            <DialogButton
              type="button"
              variant="primary"
              onClick={handlePasteFromDialog}
            >
              Add points
            </DialogButton>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
