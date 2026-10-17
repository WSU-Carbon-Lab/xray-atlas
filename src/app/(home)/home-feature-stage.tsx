"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@heroui/styles";
import { CatalogHeroSearch } from "~/components/home/catalog-hero-search";
import { PERIODIC_ELEMENTS } from "~/components/browse/unified-search/periodic-table-data";

type HomeStageId = "provenance" | "query" | "compare";

interface HomeStage {
  id: HomeStageId;
  index: string;
  title: string;
  detail: string;
}

const HOME_STAGES: readonly HomeStage[] = [
  {
    id: "provenance",
    index: "01",
    title: "Provenance and analysis",
    detail:
      "A NEXAFS spectrum keeps its edge, detection mode, geometry, and the analysis channels computed with it.",
  },
  {
    id: "query",
    index: "02",
    title: "Query the catalog",
    detail:
      "Search molecules, edges, and instruments, or pick an element and open that edge.",
  },
  {
    id: "compare",
    index: "03",
    title: "Compare spectra",
    detail:
      "One molecule holds spectra from different instruments, facilities, and sample preparations.",
  },
];

/** Carbon K-edge total-electron-yield experiment on the public P3HT record. */
const P3HT_CARBON_K_TEY_EXPERIMENT_ID = "775e9e6a-18d1-4a2a-943a-7590e18aeee9";

const P3HT_DATASET_HREF = `/molecules/p3ht?nexafsExperiment=${P3HT_CARBON_K_TEY_EXPERIMENT_ID}`;

const NEXAFS_EMPHASIS = new Set([
  "B",
  "C",
  "N",
  "O",
  "F",
  "Si",
  "P",
  "S",
  "Cl",
  "Ca",
  "Fe",
  "Ni",
  "Cu",
  "Zn",
]);

interface ProvenanceField {
  label: string;
  value: string;
}

const PROVENANCE_FIELDS: readonly ProvenanceField[] = [
  { label: "Molecule", value: "P3HT" },
  { label: "Edge", value: "Carbon K" },
  { label: "Detection", value: "Total electron yield" },
  {
    label: "Analysis",
    value:
      "Optical density, mass absorption, beta, and delta on the same energy axis",
  },
];

interface CompareAxis {
  title: string;
  detail: string;
  href: string;
  action: string;
}

const COMPARE_AXES: readonly CompareAxis[] = [
  {
    title: "Instruments",
    detail:
      "The same edge can be measured on more than one beamline and kept as separate spectra on the molecule.",
    href: "/molecules/p3ht",
    action: "Open P3HT",
  },
  {
    title: "Facilities",
    detail:
      "ALS 5.3.2.2 reads local beamtime folders in the browser. Catalog access through Tiled is in progress.",
    href: "/facilities/advanced-light-source",
    action: "Open ALS",
  },
  {
    title: "Sample preparation",
    detail:
      "Solvent, substrate, and patterning stay with the sample, so preparation is part of the comparison.",
    href: "/browse/nexafs?q=P3HT",
    action: "Browse P3HT spectra",
  },
];

/**
 * Expanding catalog-feature stage for the home page.
 *
 * The editorial list is the catalog features. Every row stays visible. The
 * open row reorients the stage: a worked NEXAFS record, catalog search with
 * the periodic table, or the three comparison axes. Does not read popularity
 * or experiment rows.
 */
export function HomeFeatureStage() {
  const [open, setOpen] = useState<HomeStageId>("query");

  return (
    <div className="mt-12 lg:mt-16">
      <div
        role="tablist"
        aria-label="Catalog features"
        aria-orientation="vertical"
        className="border-border divide-border max-w-3xl divide-y border-y"
      >
        {HOME_STAGES.map((stage) => {
          const selected = open === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              id={`home-stage-tab-${stage.id}`}
              aria-selected={selected}
              aria-controls={`home-stage-panel-${stage.id}`}
              onClick={() => setOpen(stage.id)}
              className={cn(
                "focus-visible:ring-accent grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                selected ? "text-foreground" : "hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "pt-0.5 text-sm tabular-nums",
                  selected ? "text-accent" : "text-muted",
                )}
              >
                {stage.index}
              </span>
              <span className="space-y-1">
                <span className="block font-medium">{stage.title}</span>
                <span className="text-muted block text-sm leading-6">
                  {stage.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="border-border bg-surface mt-8 min-w-0 rounded-3xl border p-5 sm:p-8">
        <HomeStagePanel stage={open} />
      </div>
    </div>
  );
}

function HomeStagePanel({ stage }: { stage: HomeStageId }) {
  switch (stage) {
    case "provenance":
      return <ProvenancePanel />;
    case "query":
      return <QueryPanel />;
    case "compare":
      return <ComparePanel />;
    default: {
      const unreachable: never = stage;
      return unreachable;
    }
  }
}

function ProvenancePanel() {
  return (
    <div
      role="tabpanel"
      id="home-stage-panel-provenance"
      aria-labelledby="home-stage-tab-provenance"
      className="flex h-full flex-col gap-8"
    >
      <div className="space-y-3">
        <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
          Worked spectrum
        </p>
        <h2 className="font-display text-foreground text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          P3HT, carbon K-edge
        </h2>
        <p className="text-muted max-w-xl text-base leading-7">
          Total electron yield, stored with the experimental context and the
          derived channels. The catalog does not renormalize this trace on read.
        </p>
      </div>
      <dl className="border-border divide-border max-w-2xl divide-y border-y">
        {PROVENANCE_FIELDS.map((field) => (
          <div
            key={field.label}
            className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6"
          >
            <dt className="text-muted text-xs font-semibold tracking-[0.14em] uppercase">
              {field.label}
            </dt>
            <dd className="text-foreground text-base">{field.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        href={P3HT_DATASET_HREF}
        className="bg-accent text-accent-foreground focus-visible:ring-accent focus-visible:ring-offset-background inline-flex w-fit rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        Open this dataset
      </Link>
    </div>
  );
}

function QueryPanel() {
  const [symbol, setSymbol] = useState<string | null>("C");
  const selected =
    PERIODIC_ELEMENTS.find((element) => element.symbol === symbol) ?? null;

  return (
    <div
      role="tabpanel"
      id="home-stage-panel-query"
      aria-labelledby="home-stage-tab-query"
      className="flex h-full flex-col gap-6"
    >
      <div className="space-y-3">
        <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
          Catalog search
        </p>
        <h2 className="font-display text-foreground text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Find an edge
        </h2>
      </div>
      <CatalogHeroSearch
        placeholder="Search molecules, edges, instruments"
        className="max-w-3xl"
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div
          role="group"
          aria-label="Periodic table"
          className="grid gap-[3px]"
          style={{
            gridTemplateColumns: "repeat(18, minmax(0, 1fr))",
          }}
        >
          {PERIODIC_ELEMENTS.map((element) => {
            const isSelected = element.symbol === symbol;
            const emphasized = NEXAFS_EMPHASIS.has(element.symbol);
            return (
              <button
                key={element.symbol}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${element.name}, atomic number ${element.z}`}
                onClick={() => setSymbol(element.symbol)}
                style={{ gridColumn: element.col, gridRow: element.row }}
                className={cn(
                  "focus-visible:ring-accent flex min-h-8 flex-col items-center justify-center rounded-sm px-0.5 py-1 text-center focus:outline-none focus-visible:ring-2",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : emphasized
                      ? "bg-default text-foreground hover:bg-accent/20"
                      : "bg-default/40 text-muted hover:bg-default",
                )}
              >
                <span className="text-[9px] leading-none tabular-nums opacity-70">
                  {element.z}
                </span>
                <span className="text-[11px] leading-none font-semibold sm:text-xs">
                  {element.symbol}
                </span>
              </button>
            );
          })}
        </div>
        {selected ? (
          <div className="border-border space-y-4 border-t pt-4 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
            <p className="text-muted text-xs font-semibold tracking-[0.16em] uppercase">
              Selected element
            </p>
            <p className="font-display text-foreground text-4xl font-semibold tracking-tight">
              {selected.symbol}
            </p>
            <p className="text-foreground text-lg">{selected.name}</p>
            <p className="text-muted text-sm leading-6">
              Atomic number {selected.z}. Open the catalog for spectra filed on
              this element.
            </p>
            <Link
              href={`/browse/nexafs?q=${encodeURIComponent(selected.name)}`}
              className="text-accent inline-flex text-sm font-medium"
            >
              Browse {selected.name}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComparePanel() {
  return (
    <div
      role="tabpanel"
      id="home-stage-panel-compare"
      aria-labelledby="home-stage-tab-compare"
      className="flex h-full flex-col gap-8"
    >
      <div className="space-y-3">
        <p className="text-accent text-xs font-semibold tracking-[0.16em] uppercase">
          Same molecule
        </p>
        <h2 className="font-display text-foreground text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          P3HT across the measurement
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COMPARE_AXES.map((axis) => (
          <article
            key={axis.title}
            className="border-border flex flex-col gap-4 rounded-2xl border p-5"
          >
            <h3 className="font-display text-foreground text-2xl font-semibold tracking-tight">
              {axis.title}
            </h3>
            <p className="text-muted flex-1 text-sm leading-6">{axis.detail}</p>
            <Link href={axis.href} className="text-accent text-sm font-medium">
              {axis.action}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
