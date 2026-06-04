"use client";

import Link from "next/link";
import { TableCellsIcon } from "@heroicons/react/24/outline";
import type { FacetField, FacetItem } from "./types";
import type { PopularitySection } from "./catalog-search-popularity";

const FIELD_LABELS: Record<FacetField, string> = {
  edge: "Edge",
  mol: "Molecule",
  instrument: "Instrument",
  contributor: "Contributor",
};

const FIELD_CHIP_CLASSES: Record<FacetField, string> = {
  edge: "bg-[color-mix(in_oklch,var(--accent)_15%,transparent)] text-accent border-[color-mix(in_oklch,var(--accent)_30%,transparent)]",
  mol: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/25",
  instrument:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  contributor:
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25",
};

const FIELD_PANEL_LABEL_CLASSES: Record<FacetField, string> = {
  edge: "text-accent",
  mol: "text-green-600 dark:text-green-400",
  instrument: "text-yellow-600 dark:text-yellow-400",
  contributor: "text-purple-600 dark:text-purple-400",
};

export interface CatalogSearchPopularityPanelProps {
  sections: PopularitySection[];
  variant: "home" | "browse";
  isLoading?: boolean;
  onSelectItem: (field: FacetField, item: FacetItem) => void;
  onOpenPeriodic?: () => void;
}

function PopularitySkeleton() {
  return (
    <div className="py-2">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="mt-2 px-3">
          <div className="bg-muted/40 mb-2 h-3 w-20 animate-pulse rounded" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((__, chipIndex) => (
              <div
                key={chipIndex}
                className="bg-muted/30 h-6 w-24 animate-pulse rounded-md"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Renders the empty-query popularity panel shared by home hero search and NEXAFS browse.
 */
export function CatalogSearchPopularityPanel({
  sections,
  variant,
  isLoading = false,
  onSelectItem,
  onOpenPeriodic,
}: CatalogSearchPopularityPanelProps) {
  if (isLoading) {
    return <PopularitySkeleton />;
  }

  return (
    <div className="py-2">
      {variant === "home" ? (
        <Link
          href="/browse/nexafs"
          className="hover:bg-default flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
        >
          <TableCellsIcon
            className="text-accent h-4 w-4 shrink-0"
            aria-hidden
          />
          <span className="text-foreground font-medium">Periodic table</span>
          <span className="text-muted text-xs">on NEXAFS browse</span>
        </Link>
      ) : (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onOpenPeriodic?.()}
          className="hover:bg-default flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        >
          <TableCellsIcon
            className="text-accent h-4 w-4 shrink-0"
            aria-hidden
          />
          <span className="text-foreground font-medium">Periodic table</span>
          <span className="text-muted text-xs">pick edges by element</span>
        </button>
      )}

      {sections.map((section) => (
        <div key={section.field} className="mt-2">
          <p
            className={[
              "mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide",
              FIELD_PANEL_LABEL_CLASSES[section.field],
            ].join(" ")}
          >
            {FIELD_LABELS[section.field]}
          </p>
          <div className="flex flex-wrap gap-1.5 px-3 pb-1">
            {section.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectItem(section.field, item)}
                className={[
                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80",
                  FIELD_CHIP_CLASSES[section.field],
                ].join(" ")}
              >
                {item.label}
                <span className="opacity-60 tabular-nums">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {variant === "home" ? (
        <div className="border-border mt-2 border-t px-3 py-2.5">
          <Link
            href="/browse/nexafs"
            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
          >
            Open full search on NEXAFS browse &rarr;
          </Link>
        </div>
      ) : null}
    </div>
  );
}
