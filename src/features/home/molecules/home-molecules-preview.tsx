import type { ReactElement } from "react";
import type { HomeSnapshotMolecule } from "../snapshot/types";

/** Tile preview: the three molecule names as chips (no network). */
export function HomeMoleculesPreview({
  molecules,
}: {
  molecules: readonly HomeSnapshotMolecule[];
}): ReactElement {
  return (
    <span className="flex flex-wrap gap-1.5">
      {molecules.map((m) => (
        <span
          key={m.id}
          className="border-border text-muted rounded-full border px-2 py-0.5 text-xs"
        >
          {m.name}
        </span>
      ))}
    </span>
  );
}
