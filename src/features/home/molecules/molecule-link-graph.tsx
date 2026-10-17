import type { ReactElement } from "react";
import Link from "next/link";
import type { HomeSnapshotMolecule } from "../snapshot/types";

/**
 * Static linking graph: each molecule column fans out to its experiments, each
 * labeled with edge, detection, and instrument. Connectors are CSS borders, so
 * the layout reflows on any width without SVG measurement.
 */
export function MoleculeLinkGraph({
  molecules,
}: {
  molecules: readonly HomeSnapshotMolecule[];
}): ReactElement {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {molecules.map((m) => (
        <div
          key={m.id}
          style={{ viewTransitionName: `home-mol-${m.slug}` }}
          className="space-y-3"
        >
          <Link
            href={`/molecules/${m.slug}`}
            className="border-accent/60 bg-accent/10 text-foreground inline-flex rounded-full border px-3 py-1 text-sm font-semibold"
          >
            {m.name}
          </Link>
          <ul className="border-border ml-4 space-y-2 border-l pl-4">
            {m.links.map((l) => (
              <li
                key={l.experimentId}
                className="before:bg-border relative before:absolute before:top-1/2 before:-left-4 before:h-px before:w-4"
              >
                <Link
                  href={`/molecules/${m.slug}?nexafsExperiment=${l.experimentId}`}
                  className="home-chip h-auto flex-wrap py-1 text-xs"
                >
                  <span className="text-accent font-semibold">{l.edge}</span>
                  <span>{l.detection}</span>
                  <span className="text-muted">
                    {l.instrument} · {l.facility}
                  </span>
                </Link>
              </li>
            ))}
            {m.links.length === 0 && (
              <li className="text-muted text-xs">No spectra yet</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}
