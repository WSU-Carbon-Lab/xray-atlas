"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import type { HomeSnapshotMolecule } from "../snapshot/types";
import { MoleculeLinkGraph } from "./molecule-link-graph";

type MoleculeViewMode = "cards" | "links";

/** Three curated molecule cards with a toggle into the linking graph. */
export function HomeMoleculesView({
  molecules,
}: {
  molecules: readonly HomeSnapshotMolecule[];
}): ReactElement {
  const [mode, setMode] = useState<MoleculeViewMode>("cards");
  const swap = (next: MoleculeViewMode): void => {
    const run = (): void => setMode(next);
    if (
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const transition = document.startViewTransition(run);
      transition.ready.catch(() => undefined);
      transition.finished.catch(() => undefined);
    } else {
      run();
    }
  };
  return (
    <div className="space-y-6">
      <p className="text-muted max-w-prose leading-7">
        A molecule record is the single identity of a compound in the Atlas.
        Spectra, samples, and publications all attach to it, so one page gathers
        everything measured on that material.
      </p>
      <div role="group" aria-label="Molecule view" className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === "cards"}
          className={
            mode === "cards"
              ? "home-chip border-accent text-accent"
              : "home-chip"
          }
          onClick={() => swap("cards")}
        >
          Records
        </button>
        <button
          type="button"
          aria-pressed={mode === "links"}
          className={
            mode === "links"
              ? "home-chip border-accent text-accent"
              : "home-chip"
          }
          onClick={() => swap("links")}
        >
          How they link
        </button>
      </div>
      {mode === "cards" ? (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {molecules.map((m) => (
            <li
              key={m.id}
              style={{ viewTransitionName: `home-mol-${m.slug}` }}
              className="border-border bg-background relative flex flex-col gap-3 rounded-2xl border p-4"
            >
              <div className="flex h-36 items-center justify-center overflow-hidden">
                {m.imageUrl ? (
                  <MoleculeImageSVG
                    imageUrl={m.imageUrl}
                    name={m.name}
                    className="h-36 w-full"
                    fallback={
                      <span className="font-display text-muted text-2xl">
                        {m.formula}
                      </span>
                    }
                  />
                ) : (
                  <span className="font-display text-muted text-2xl">
                    {m.formula}
                  </span>
                )}
              </div>
              <Link
                href={`/molecules/${m.slug}`}
                className="font-display text-foreground text-lg font-semibold after:absolute after:inset-0"
              >
                {m.name}
              </Link>
              <p className="text-muted text-sm leading-6">{m.blurb}</p>
              <p className="text-muted mt-auto text-xs tabular-nums">
                {m.formula} · {m.datasetCount} datasets
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <MoleculeLinkGraph molecules={molecules} />
      )}
    </div>
  );
}
