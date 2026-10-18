"use client";

import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from "react";
import Link from "next/link";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import type { HomeSnapshotLink, HomeSnapshotMolecule } from "../snapshot/types";
import { HomeDisplayTabs } from "../stage/home-display-tabs";
import { HomeStagePreview } from "../stage/home-stage-preview";

const HIERARCHIES = [
  { id: "molecule", label: "Molecule" },
  { id: "edge", label: "Edge" },
  { id: "instrument", label: "Instrument" },
  { id: "facility", label: "Facility" },
  { id: "collection", label: "Collection" },
] as const;

type HierarchyId = (typeof HIERARCHIES)[number]["id"];

const CATALOG_CAPTION =
  "Hierarchical groupings to view the interconnected data.";

const COLUMN_LABELS: Record<HierarchyId, readonly [string, string, string]> = {
  molecule: ["Molecule", "Edge", "Spectrum"],
  edge: ["Edge", "Molecule", "Spectrum"],
  instrument: ["Instrument", "Molecule", "Spectrum"],
  facility: ["Facility", "Instrument", "Spectrum"],
  collection: ["Collection", "Molecule", "Spectrum"],
};

const EDGE_ORDER = ["C K", "N K", "O K", "F K", "S K"] as const;
const DETECTION_ORDER = ["TEY", "PEY", "FY", "TRANS"] as const;

interface CatalogNode {
  key: string;
  title: string;
  detail: string;
  href: string | null;
  imageUrl: string | null;
  children: CatalogNode[];
}

interface FlatSpectrum {
  molecule: HomeSnapshotMolecule;
  link: HomeSnapshotLink;
}

function datasetHref(slug: string, experimentId: string): string {
  return `/molecules/${slug}?nexafsExperiment=${experimentId}`;
}

function spectrumCount(count: number): string {
  return `${count} ${count === 1 ? "spectrum" : "spectra"}`;
}

function rank(order: readonly string[], value: string): number {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function compareRank(order: readonly string[], a: string, b: string): number {
  const delta = rank(order, a) - rank(order, b);
  return delta === 0 ? a.localeCompare(b) : delta;
}

function groupBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

function flatten(molecules: readonly HomeSnapshotMolecule[]): FlatSpectrum[] {
  const rows: FlatSpectrum[] = [];
  for (const molecule of molecules) {
    for (const link of molecule.links) rows.push({ molecule, link });
  }
  return rows;
}

function moleculeIndex(
  molecules: readonly HomeSnapshotMolecule[],
): Map<string, number> {
  return new Map(molecules.map((molecule, index) => [molecule.id, index]));
}

function compareMolecules(
  order: Map<string, number>,
  a: HomeSnapshotMolecule,
  b: HomeSnapshotMolecule,
): number {
  return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
}

function sortSpectra(rows: readonly FlatSpectrum[]): FlatSpectrum[] {
  return [...rows].sort((a, b) => {
    const detection = compareRank(
      DETECTION_ORDER,
      a.link.detection,
      b.link.detection,
    );
    if (detection !== 0) return detection;
    return a.link.instrument.localeCompare(b.link.instrument);
  });
}

function leaf(row: FlatSpectrum, title: string, detail: string): CatalogNode {
  return {
    key: row.link.experimentId,
    title,
    detail,
    href: datasetHref(row.molecule.slug, row.link.experimentId),
    imageUrl: null,
    children: [],
  };
}

function moleculeBranch(
  molecule: HomeSnapshotMolecule,
  key: string,
  children: CatalogNode[],
): CatalogNode {
  return {
    key,
    title: molecule.name,
    detail: molecule.formula,
    href: `/molecules/${molecule.slug}`,
    imageUrl: molecule.imageUrl,
    children,
  };
}

function detectionLeaves(rows: readonly FlatSpectrum[]): CatalogNode[] {
  return sortSpectra(rows).map((row) =>
    leaf(
      row,
      row.link.detection,
      `${row.link.instrument} · ${row.link.facility}`,
    ),
  );
}

/**
 * Builds the three-level catalog for one grouping.
 *
 * Molecule and edge roots follow the curated molecule order and the
 * C, N, O, F, S edge order. Instrument and facility roots are alphabetical.
 * Collection roots follow TEY, PEY, FY, TRANS.
 */
function buildCatalog(
  molecules: readonly HomeSnapshotMolecule[],
  hierarchy: HierarchyId,
): CatalogNode[] {
  if (hierarchy === "molecule") return moleculeCatalog(molecules);
  const rows = flatten(molecules);
  if (hierarchy === "edge") return edgeCatalog(molecules, rows);
  if (hierarchy === "instrument") return instrumentCatalog(molecules, rows);
  if (hierarchy === "facility") return facilityCatalog(rows);
  return collectionCatalog(molecules, rows);
}

function moleculeCatalog(
  molecules: readonly HomeSnapshotMolecule[],
): CatalogNode[] {
  return molecules.map((molecule) => {
    const rows = molecule.links.map((link) => ({ molecule, link }));
    const byEdge = groupBy(rows, (row) => row.link.edge);
    const edges = [...byEdge.keys()].sort((a, b) =>
      compareRank(EDGE_ORDER, a, b),
    );
    return moleculeBranch(
      molecule,
      molecule.id,
      edges.map((edge) => {
        const group = byEdge.get(edge) ?? [];
        return {
          key: `${molecule.id}:${edge}`,
          title: edge,
          detail: spectrumCount(group.length),
          href: null,
          imageUrl: null,
          children: detectionLeaves(group),
        };
      }),
    );
  });
}

function edgeCatalog(
  molecules: readonly HomeSnapshotMolecule[],
  rows: readonly FlatSpectrum[],
): CatalogNode[] {
  const order = moleculeIndex(molecules);
  const byEdge = groupBy(rows, (row) => row.link.edge);
  return [...byEdge.keys()]
    .sort((a, b) => compareRank(EDGE_ORDER, a, b))
    .map((edge) => {
      const edgeRows = byEdge.get(edge) ?? [];
      const byMolecule = groupBy(edgeRows, (row) => row.molecule.id);
      const children = [...byMolecule.values()]
        .sort((a, b) => compareMolecules(order, a[0]!.molecule, b[0]!.molecule))
        .map((group) =>
          moleculeBranch(
            group[0]!.molecule,
            `${edge}:${group[0]!.molecule.id}`,
            detectionLeaves(group),
          ),
        );
      return {
        key: `edge:${edge}`,
        title: edge,
        detail: spectrumCount(edgeRows.length),
        href: null,
        imageUrl: null,
        children,
      };
    });
}

function instrumentCatalog(
  molecules: readonly HomeSnapshotMolecule[],
  rows: readonly FlatSpectrum[],
): CatalogNode[] {
  const order = moleculeIndex(molecules);
  const byInstrument = groupBy(rows, (row) => row.link.instrument);
  return [...byInstrument.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((instrument) => {
      const instrumentRows = byInstrument.get(instrument) ?? [];
      const facilities = new Set(
        instrumentRows.map((row) => row.link.facility),
      );
      const byMolecule = groupBy(instrumentRows, (row) => row.molecule.id);
      const children = [...byMolecule.values()]
        .sort((a, b) => compareMolecules(order, a[0]!.molecule, b[0]!.molecule))
        .map((group) =>
          moleculeBranch(
            group[0]!.molecule,
            `${instrument}:${group[0]!.molecule.id}`,
            sortSpectra(group).map((row) =>
              leaf(
                row,
                `${row.link.edge} ${row.link.detection}`,
                row.link.facility,
              ),
            ),
          ),
        );
      const facility = facilities.size === 1 ? [...facilities][0]! : "";
      return {
        key: `instrument:${instrument}`,
        title: instrument,
        detail: facility || spectrumCount(instrumentRows.length),
        href: null,
        imageUrl: null,
        children,
      };
    });
}

function facilityCatalog(rows: readonly FlatSpectrum[]): CatalogNode[] {
  const byFacility = groupBy(rows, (row) => row.link.facility);
  return [...byFacility.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((facility) => {
      const facilityRows = byFacility.get(facility) ?? [];
      const byInstrument = groupBy(facilityRows, (row) => row.link.instrument);
      const children = [...byInstrument.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((instrument) => {
          const group = sortSpectra(byInstrument.get(instrument) ?? []);
          return {
            key: `${facility}:${instrument}`,
            title: instrument,
            detail: spectrumCount(group.length),
            href: null,
            imageUrl: null,
            children: group.map((row) =>
              leaf(
                row,
                row.molecule.name,
                `${row.link.edge} ${row.link.detection}`,
              ),
            ),
          };
        });
      return {
        key: `facility:${facility}`,
        title: facility,
        detail: spectrumCount(facilityRows.length),
        href: null,
        imageUrl: null,
        children,
      };
    });
}

function collectionCatalog(
  molecules: readonly HomeSnapshotMolecule[],
  rows: readonly FlatSpectrum[],
): CatalogNode[] {
  const order = moleculeIndex(molecules);
  const byDetection = groupBy(rows, (row) => row.link.detection);
  return [...byDetection.keys()]
    .sort((a, b) => compareRank(DETECTION_ORDER, a, b))
    .map((detection) => {
      const detectionRows = byDetection.get(detection) ?? [];
      const byMolecule = groupBy(detectionRows, (row) => row.molecule.id);
      const children = [...byMolecule.values()]
        .sort((a, b) => compareMolecules(order, a[0]!.molecule, b[0]!.molecule))
        .map((group) =>
          moleculeBranch(
            group[0]!.molecule,
            `${detection}:${group[0]!.molecule.id}`,
            sortSpectra(group).map((row) =>
              leaf(
                row,
                row.link.edge,
                `${row.link.instrument} · ${row.link.facility}`,
              ),
            ),
          ),
        );
      return {
        key: `collection:${detection}`,
        title: detection,
        detail: spectrumCount(detectionRows.length),
        href: null,
        imageUrl: null,
        children,
      };
    });
}

function moveSelection(
  event: KeyboardEvent<HTMLElement>,
  nodes: readonly CatalogNode[],
  selectedKey: string,
  onSelect: (key: string) => void,
): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const index = nodes.findIndex((node) => node.key === selectedKey);
  if (index < 0) return;
  const next = event.key === "ArrowDown" ? index + 1 : index - 1;
  const node = nodes[next];
  if (!node) return;
  event.preventDefault();
  onSelect(node.key);
  const buttons = event.currentTarget.querySelectorAll("button");
  buttons[next]?.focus();
}

function ColumnHeading({ label }: { label: string }): ReactElement {
  return <p className="home-label px-3 pb-2">{label}</p>;
}

function NodeCopy({ node }: { node: CatalogNode }): ReactElement {
  return (
    <span className="min-w-0 flex-1">
      <span title={node.title} className="block truncate text-sm font-medium">
        {node.title}
      </span>
      {node.detail ? (
        <span
          title={node.detail}
          className={
            node.imageUrl
              ? "text-muted block truncate font-mono text-xs"
              : "text-muted line-clamp-2 text-xs leading-5"
          }
        >
          {node.detail}
        </span>
      ) : null}
    </span>
  );
}

function NodeGlyph({ node }: { node: CatalogNode }): ReactElement | null {
  if (!node.imageUrl) return null;
  return (
    <span className="bg-surface size-8 shrink-0 overflow-hidden rounded-md">
      <MoleculeImageSVG
        imageUrl={node.imageUrl}
        name={node.title}
        className="home-mol-glyph"
        fallback={
          <span className="text-muted flex size-full items-center justify-center text-[0.625rem]">
            {node.title.slice(0, 2)}
          </span>
        }
      />
    </span>
  );
}

/**
 * Three columns for one catalog grouping. Choosing a row on the left fills
 * the next column. Spectrum rows open that dataset.
 */
function CatalogColumns({
  nodes,
  labels,
}: {
  nodes: readonly CatalogNode[];
  labels: readonly [string, string, string];
}): ReactElement {
  const [rootKey, setRootKey] = useState(nodes[0]?.key ?? "");
  const [branchKey, setBranchKey] = useState(nodes[0]?.children[0]?.key ?? "");
  const root = nodes.find((node) => node.key === rootKey) ?? nodes[0];
  const branches = root?.children ?? [];
  const branch = branches.find((node) => node.key === branchKey) ?? branches[0];
  const leaves = branch?.children ?? [];
  const chooseRoot = (key: string): void => {
    setRootKey(key);
    const next = nodes.find((node) => node.key === key);
    setBranchKey(next?.children[0]?.key ?? "");
  };
  return (
    <div id="home-catalog-columns" className="flex h-full min-h-0 flex-col">
      <p className="text-muted mb-3 shrink-0 text-sm">
        <span className="text-foreground font-medium">
          {root?.title ?? "Catalog"}
        </span>
        {branch ? (
          <>
            <span aria-hidden> · </span>
            <span className="text-foreground font-medium">{branch.title}</span>
          </>
        ) : null}
        <span aria-hidden> · </span>
        {spectrumCount(leaves.length)}
      </p>
      <div className="divide-border grid min-h-0 flex-1 grid-cols-3 divide-x">
        <section className="flex min-h-0 min-w-0 flex-col">
          <ColumnHeading label={labels[0]} />
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            onKeyDown={(event) =>
              moveSelection(event, nodes, root?.key ?? "", chooseRoot)
            }
          >
            {nodes.map((node) => (
              <button
                key={node.key}
                type="button"
                aria-pressed={node.key === root?.key}
                onClick={() => chooseRoot(node.key)}
                className={
                  node.key === root?.key
                    ? "border-accent bg-foreground/5 text-foreground flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left"
                    : "text-muted hover:text-foreground flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2 text-left"
                }
              >
                <NodeGlyph node={node} />
                <NodeCopy node={node} />
              </button>
            ))}
          </div>
        </section>
        <section className="flex min-h-0 min-w-0 flex-col">
          <ColumnHeading label={labels[1]} />
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            onKeyDown={(event) =>
              moveSelection(event, branches, branch?.key ?? "", setBranchKey)
            }
          >
            {branches.map((node) => (
              <button
                key={node.key}
                type="button"
                aria-pressed={node.key === branch?.key}
                onClick={() => setBranchKey(node.key)}
                className={
                  node.key === branch?.key
                    ? "border-accent bg-foreground/5 text-foreground flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left"
                    : "text-muted hover:text-foreground flex w-full items-center gap-2 border-l-2 border-transparent px-3 py-2 text-left"
                }
              >
                <NodeGlyph node={node} />
                <NodeCopy node={node} />
              </button>
            ))}
          </div>
        </section>
        <section className="flex min-h-0 min-w-0 flex-col">
          <ColumnHeading label={labels[2]} />
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {leaves.map((node) => (
              <li key={node.key}>
                {node.href ? (
                  <Link
                    href={node.href}
                    className="hover:bg-foreground/5 hover:text-foreground flex items-center gap-2 px-3 py-2 no-underline"
                  >
                    <NodeGlyph node={node} />
                    <NodeCopy node={node} />
                  </Link>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <NodeCopy node={node} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/**
 * Catalog for the home Catalog feature.
 *
 * `molecules` is the curated snapshot. The underline control picks which
 * field is the first column. The next two columns are the levels under the
 * selected row, and a spectrum row links to that dataset.
 */
export function HomeMoleculesView({
  molecules,
}: {
  molecules: readonly HomeSnapshotMolecule[];
}): ReactElement {
  const [hierarchy, setHierarchy] = useState<HierarchyId>("molecule");
  const branches = useMemo(
    () => buildCatalog(molecules, hierarchy),
    [molecules, hierarchy],
  );
  return (
    <HomeStagePreview caption={CATALOG_CAPTION}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <HomeDisplayTabs
          label="Catalog grouping"
          tabs={HIERARCHIES}
          value={hierarchy}
          onChange={setHierarchy}
          idPrefix="home-catalog"
          controls="home-catalog-columns"
        />
        <div className="relative min-h-0 flex-1">
          <div className="absolute inset-0">
            <CatalogColumns
              key={hierarchy}
              nodes={branches}
              labels={COLUMN_LABELS[hierarchy]}
            />
          </div>
        </div>
      </div>
    </HomeStagePreview>
  );
}
