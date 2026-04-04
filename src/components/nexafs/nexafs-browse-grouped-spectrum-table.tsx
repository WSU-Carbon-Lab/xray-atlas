"use client";

import { useCallback, useMemo, useState, useId } from "react";
import { ChevronDown, Columns3, Copy } from "lucide-react";
import {
  Accordion,
  Button,
  Chip,
  Dropdown,
  Header,
  Pagination,
  Table,
  Tooltip,
  Checkbox,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import type { SpectrumPoint } from "~/components/plots/types";
import {
  phiLeafEnergySubtitle,
  spectrumPointsToDetailedCsv,
  type SpectrumPolarizationNode,
} from "~/features/process-nexafs/utils";
import { showToast } from "~/components/ui/toast";

const PAGE_SIZE = 10;

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

const THETA_PHI_CHIP_COLORS = [
  "accent",
  "success",
  "warning",
  "danger",
  "default",
] as const;

type ThetaPhiChipColor = (typeof THETA_PHI_CHIP_COLORS)[number];

function chipColorForIndex(index: number): ThetaPhiChipColor {
  return (
    THETA_PHI_CHIP_COLORS[index % THETA_PHI_CHIP_COLORS.length] ?? "accent"
  );
}

export interface NexafsBrowseGroupedSpectrumTableProps {
  idPrefix: string;
  tree: SpectrumPolarizationNode[];
  showOdCol: boolean;
  showMassCol: boolean;
  showBetaCol: boolean;
  showI0Col: boolean;
}

interface BrowseGeometrySection {
  key: string;
  theta: number | null;
  phi: number | null;
  energySubtitle: string;
  points: SpectrumPoint[];
}

function globalThetaPhiChipMaps(tree: SpectrumPolarizationNode[]): {
  thetaColorByValue: Map<number, ThetaPhiChipColor>;
  phiColorByValue: Map<number, ThetaPhiChipColor>;
} {
  const thetas = new Set<number>();
  const phis = new Set<number>();
  for (const pol of tree) {
    for (const tn of pol.thetaNodes) {
      for (const leaf of tn.phiLeaves) {
        for (const p of leaf.points) {
          if (typeof p.theta === "number" && Number.isFinite(p.theta)) {
            thetas.add(p.theta);
          }
          if (typeof p.phi === "number" && Number.isFinite(p.phi)) {
            phis.add(p.phi);
          }
        }
      }
    }
  }
  const sortedTheta = Array.from(thetas).sort((a, b) => a - b);
  const sortedPhi = Array.from(phis).sort((a, b) => a - b);
  const thetaColorByValue = new Map<number, ThetaPhiChipColor>();
  const phiColorByValue = new Map<number, ThetaPhiChipColor>();
  sortedTheta.forEach((v, i) => {
    thetaColorByValue.set(v, chipColorForIndex(i));
  });
  sortedPhi.forEach((v, i) => {
    phiColorByValue.set(v, chipColorForIndex(i));
  });
  return { thetaColorByValue, phiColorByValue };
}

function flattenSpectrumTreeForBrowseTable(
  tree: SpectrumPolarizationNode[],
): BrowseGeometrySection[] {
  const out: BrowseGeometrySection[] = [];
  for (const pol of tree) {
    for (const tn of pol.thetaNodes) {
      for (const leaf of tn.phiLeaves) {
        out.push({
          key: `${pol.polarizationKey}|${tn.thetaKey}|${leaf.phiKey}`,
          theta: tn.theta,
          phi: leaf.phi,
          energySubtitle: phiLeafEnergySubtitle(leaf),
          points: leaf.points,
        });
      }
    }
  }
  return out;
}

function accordionItemDomId(idPrefix: string, sectionKey: string): string {
  const raw = `${idPrefix}-${sectionKey}`;
  return raw.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function SpectrumLeafTable({
  points,
  uniqueThetaValues,
  uniquePhiValues,
  showOdCol,
  showMassCol,
  showBetaCol,
  showI0Col,
  tableRowIdPrefix,
}: {
  points: SpectrumPoint[];
  uniqueThetaValues: number[];
  uniquePhiValues: number[];
  showOdCol: boolean;
  showMassCol: boolean;
  showBetaCol: boolean;
  showI0Col: boolean;
  tableRowIdPrefix: string;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);

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
      if (id === "theta" && uniqueThetaValues.length === 0) return false;
      if (id === "phi" && uniquePhiValues.length === 0) return false;
      return true;
    },
    [visibleColumns, uniqueThetaValues.length, uniquePhiValues.length],
  );

  const visibleColumnList = useMemo(
    () =>
      [
        ...SPECTRUM_TABLE_COLUMNS.filter((c) => showColumn(c.id)),
        ...(showOdCol ? [{ id: "od" as const, label: "OD" }] : []),
        ...(showMassCol ? [{ id: "mass" as const, label: "Mass abs." }] : []),
        ...(showBetaCol ? [{ id: "beta" as const, label: "beta" }] : []),
        ...(showI0Col ? [{ id: "i0" as const, label: "I0" }] : []),
      ],
    [showColumn, showOdCol, showMassCol, showBetaCol, showI0Col],
  );

  const totalPages = Math.max(1, Math.ceil(points.length / PAGE_SIZE));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const pageRows = points.slice(start, start + PAGE_SIZE);
  const end = Math.min(start + PAGE_SIZE, points.length);

  const spectrumTableRowHeaderId =
    visibleColumnList.find((c) => c.id === "energy")?.id ??
    visibleColumnList[0]?.id;

  const handleCopyCsv = useCallback(() => {
    const csv = spectrumPointsToDetailedCsv(points);
    void navigator.clipboard.writeText(csv).then(() => {
      showToast(`Copied ${points.length} rows as CSV`, "success");
    });
  }, [points]);

  const tableClassNames = {
    table:
      "w-full text-sm [&_td]:whitespace-nowrap [&_td]:font-mono [&_td]:tabular-nums [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_tbody_tr]:transition-colors [&_tbody_tr:nth-child(odd)]:bg-[var(--surface-2)] [&_tbody_tr:nth-child(even)]:bg-[var(--surface-3)] [&_tbody_tr:hover]:bg-[var(--surface-3)] [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-[var(--z-sticky)] [&_thead]:bg-[var(--surface-2)] [&_thead_th]:bg-[var(--surface-2)] [&_thead_th]:text-right [&_thead_th]:text-xs [&_thead_th]:font-semibold [&_thead_th]:uppercase [&_thead_th]:tracking-wider [&_thead_th]:text-[var(--text-secondary)] [&_thead_th]:border-b [&_thead_th]:border-[var(--border-default)]",
  };

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tooltip delay={0}>
          <Tooltip.Trigger
            className="inline-flex"
            aria-label="Table columns; hover for help"
          >
            <Dropdown>
              <Dropdown.Trigger
                className={cn(
                  buttonVariants({ size: "sm", variant: "ghost" }),
                  "gap-1.5 text-xs font-medium text-[var(--text-secondary)]",
                )}
              >
                <Columns3 className="size-3.5" />
                Columns
              </Dropdown.Trigger>
              <Dropdown.Popover className="min-w-[180px]">
                <Dropdown.Menu
                  aria-label="Toggle table columns"
                  className="min-w-[180px]"
                  selectionMode="none"
                >
                  <Dropdown.Section>
                    <Header>Show columns</Header>
                    {SPECTRUM_TABLE_COLUMNS.map(({ id, label }) => (
                      <Dropdown.Item
                        key={id}
                        id={id}
                        textValue={label}
                        className="cursor-default py-1.5"
                      >
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <Checkbox
                            isSelected={visibleColumns[id]}
                            onChange={() => toggleColumn(id)}
                            className="[&_[data-slot=checkbox-content]]:text-xs [&_[data-slot=checkbox-content]]:text-[var(--text-primary)]"
                          >
                            {label}
                          </Checkbox>
                        </div>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Section>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Tooltip.Trigger>
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
          onPress={handleCopyCsv}
        >
          <Copy className="size-3.5" />
          Copy as CSV
        </Button>
      </div>

      {visibleColumnList.length === 0 ? (
        <p className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-6 text-center text-xs text-[var(--text-tertiary)]">
          Show at least one column to view the table.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)]">
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Spectrum points"
                className={tableClassNames.table}
              >
                <Table.Header>
                  {visibleColumnList.map((c) => (
                    <Table.Column
                      key={c.id}
                      id={c.id}
                      isRowHeader={c.id === spectrumTableRowHeaderId}
                    >
                      {c.label}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body items={pageRows}>
                  {(point) => (
                    <Table.Row
                      id={`${tableRowIdPrefix}-${point.energy}-${point.absorption}-${String(point.theta)}-${String(point.phi)}`}
                    >
                      {visibleColumnList.map((col) => {
                        if (col.id === "energy") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {point.energy.toFixed(2)}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "mu") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {point.absorption.toExponential(3)}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "theta") {
                          const t = point.theta;
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof t === "number" ? (
                                <Chip
                                  color={
                                    thetaColorByValue.get(t) ?? "accent"
                                  }
                                  size="sm"
                                  variant="soft"
                                >
                                  {t.toFixed(1)}
                                </Chip>
                              ) : (
                                "—"
                              )}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "phi") {
                          const ph = point.phi;
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof ph === "number" ? (
                                <Chip
                                  color={
                                    phiColorByValue.get(ph) ?? "accent"
                                  }
                                  size="sm"
                                  variant="soft"
                                >
                                  {ph.toFixed(1)}
                                </Chip>
                              ) : (
                                "—"
                              )}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "od") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof point.od === "number"
                                ? point.od.toExponential(3)
                                : ""}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "mass") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof point.massabsorption === "number"
                                ? point.massabsorption.toExponential(3)
                                : ""}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "beta") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof point.beta === "number"
                                ? point.beta.toExponential(3)
                                : ""}
                            </Table.Cell>
                          );
                        }
                        if (col.id === "i0") {
                          return (
                            <Table.Cell key={col.id} className="text-right">
                              {typeof point.i0 === "number"
                                ? point.i0.toExponential(3)
                                : ""}
                            </Table.Cell>
                          );
                        }
                        return null;
                      })}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3">
            <span className="text-xs text-[var(--text-tertiary)]">
              {points.length === 0
                ? "0 results"
                : `${start + 1} to ${end} of ${points.length} results`}
            </span>
            {totalPages > 1 ? (
              <Pagination size="sm" className="gap-1">
                <Pagination.Content className="gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={safePage === 0}
                      aria-label="Previous page"
                      onPress={() => {
                        setPageIndex((i) => Math.max(0, i - 1));
                      }}
                      className="rounded-md border border-[var(--border-default)] bg-[var(--surface-1)]"
                    >
                      <Pagination.PreviousIcon />
                    </Pagination.Previous>
                  </Pagination.Item>
                  {totalPages <= 20
                    ? Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <Pagination.Item key={p}>
                            <Pagination.Link
                              isActive={p === safePage + 1}
                              onPress={() => {
                                setPageIndex(p - 1);
                              }}
                              className={`rounded-md border border-[var(--border-default)] bg-[var(--surface-1)] text-[var(--text-primary)] ${
                                p === safePage + 1
                                  ? "border-accent bg-accent text-accent-foreground"
                                  : ""
                              }`}
                            >
                              {p}
                            </Pagination.Link>
                          </Pagination.Item>
                        ),
                      )
                    : null}
                  {totalPages > 20 ? (
                    <Pagination.Item>
                      <span className="text-text-secondary px-2 text-xs tabular-nums">
                        {safePage + 1} / {totalPages}
                      </span>
                    </Pagination.Item>
                  ) : null}
                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={safePage + 1 >= totalPages}
                      aria-label="Next page"
                      onPress={() => {
                        setPageIndex((i) =>
                          Math.min(totalPages - 1, i + 1),
                        );
                      }}
                      className="rounded-md border border-[var(--border-default)] bg-[var(--surface-1)]"
                    >
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function NexafsBrowseGroupedSpectrumTable({
  idPrefix,
  tree,
  showOdCol,
  showMassCol,
  showBetaCol,
  showI0Col,
}: NexafsBrowseGroupedSpectrumTableProps) {
  const instanceSuffix = useId();
  const basePrefix =
    idPrefix.trim().length > 0 ? idPrefix.trim() : "spectrum";
  const stablePrefix = `${basePrefix}-${instanceSuffix}`;

  const sections = useMemo(
    () => flattenSpectrumTreeForBrowseTable(tree),
    [tree],
  );

  const { thetaColorByValue, phiColorByValue } = useMemo(
    () => globalThetaPhiChipMaps(tree),
    [tree],
  );

  if (sections.length === 0) {
    return (
      <div className="flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-6 text-center text-sm text-[var(--text-tertiary)]">
        No spectrum geometry groups to display.
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--surface-1)] p-3">
      <Accordion
        defaultExpandedKeys={[]}
        variant="surface"
        className="w-full rounded-xl"
      >
        {sections.map((s) => {
          const ut = new Set<number>();
          const up = new Set<number>();
          for (const p of s.points) {
            if (typeof p.theta === "number") ut.add(p.theta);
            if (typeof p.phi === "number") up.add(p.phi);
          }
          const uniqueThetaValues = Array.from(ut).sort((a, b) => a - b);
          const uniquePhiValues = Array.from(up).sort((a, b) => a - b);
          const itemId = accordionItemDomId(stablePrefix, s.key);
          const thetaChipColor =
            typeof s.theta === "number"
              ? (thetaColorByValue.get(s.theta) ?? "accent")
              : "default";
          const phiChipColor =
            typeof s.phi === "number"
              ? (phiColorByValue.get(s.phi) ?? "accent")
              : "default";

          return (
            <Accordion.Item
              key={itemId}
              id={itemId}
              className="rounded-lg first:rounded-t-xl last:rounded-b-xl [&+&]:mt-2"
            >
              <Accordion.Heading>
                <Accordion.Trigger className="flex min-h-[52px] w-full items-center justify-between gap-2 rounded-lg px-4 py-3 text-left">
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    {typeof s.theta === "number" ? (
                      <Chip
                        color={thetaChipColor}
                        size="sm"
                        variant="soft"
                      >
                        {s.theta.toFixed(1)}
                      </Chip>
                    ) : (
                      <span className="text-[var(--text-tertiary)] text-xs">
                        —
                      </span>
                    )}
                    {typeof s.phi === "number" ? (
                      <Chip color={phiChipColor} size="sm" variant="soft">
                        {s.phi.toFixed(1)}
                      </Chip>
                    ) : (
                      <span className="text-[var(--text-tertiary)] text-xs">
                        —
                      </span>
                    )}
                    <span className="text-[var(--text-tertiary)] text-xs tabular-nums">
                      {s.energySubtitle}
                    </span>
                  </span>
                  <Accordion.Indicator>
                    <ChevronDown className="size-4 shrink-0" />
                  </Accordion.Indicator>
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="px-2 pb-3">
                  <SpectrumLeafTable
                    points={s.points}
                    uniqueThetaValues={uniqueThetaValues}
                    uniquePhiValues={uniquePhiValues}
                    showOdCol={showOdCol}
                    showMassCol={showMassCol}
                    showBetaCol={showBetaCol}
                    showI0Col={showI0Col}
                    tableRowIdPrefix={itemId}
                  />
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
}
