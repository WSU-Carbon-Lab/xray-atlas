"use client";

import type { ReactElement } from "react";
import { cn } from "@heroui/styles";
import { PERIODIC_ELEMENTS } from "~/components/browse/unified-search/periodic-table-data";
import type { HomeEdgeOption } from "../snapshot/types";

const STRIP = [
  "B",
  "C",
  "N",
  "O",
  "F",
  "Si",
  "P",
  "S",
  "Cl",
  "Ti",
  "Fe",
  "Co",
  "Ni",
  "Cu",
  "Zn",
] as const;

export interface PeriodicStripProps {
  edges: readonly HomeEdgeOption[];
  selected: readonly string[];
  onToggle: (edge: HomeEdgeOption) => void;
}

/** Compact element strip; elements with no catalog edge render disabled. Picks the K edge when present. */
export function PeriodicStrip({
  edges,
  selected,
  onToggle,
}: PeriodicStripProps): ReactElement {
  return (
    <div
      role="group"
      aria-label="Pick an absorption edge"
      className="flex flex-wrap gap-1.5"
    >
      {STRIP.map((symbol) => {
        const el = PERIODIC_ELEMENTS.find((e) => e.symbol === symbol);
        const options = edges.filter((e) => e.symbol === symbol);
        const edge = options.find((e) => /\bK$/.test(e.label)) ?? options[0];
        const picked = options.find((o) => selected.includes(o.edgeId));
        const on = picked !== undefined;
        const name = el?.name ?? symbol;
        return (
          <button
            key={symbol}
            type="button"
            disabled={!edge}
            aria-pressed={on}
            aria-label={
              edge ? `${name}, ${edge.label} edge` : `${name}, no data yet`
            }
            title={
              edge
                ? `${name} · ${options.map((o) => o.label).join(", ")}`
                : `${name} · no data yet`
            }
            onClick={() => {
              const target = picked ?? edge;
              if (target) onToggle(target);
            }}
            className={cn("home-element", on && "home-element--on")}
          >
            <span className="text-[0.625rem] leading-none opacity-60">
              {el?.z}
            </span>
            <span className="text-sm leading-none font-semibold">{symbol}</span>
          </button>
        );
      })}
    </div>
  );
}
