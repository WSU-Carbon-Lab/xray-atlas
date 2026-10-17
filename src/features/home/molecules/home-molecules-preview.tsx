import type { ReactElement } from "react";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import type { HomeSnapshotMolecule } from "../snapshot/types";

function FormulaGlyph({ formula }: { formula: string }): ReactElement {
  return (
    <span className="font-display text-muted truncate text-sm">{formula}</span>
  );
}

/** Tile preview: three small structure glyphs from object storage, formula fallback; no DB access. */
export function HomeMoleculesPreview({
  molecules,
}: {
  molecules: readonly HomeSnapshotMolecule[];
}): ReactElement {
  return (
    <span className="grid h-full grid-cols-3 gap-2">
      {molecules.map((m) => (
        <span
          key={m.id}
          className="flex min-w-0 items-center justify-center overflow-hidden"
        >
          {m.imageUrl ? (
            <MoleculeImageSVG
              imageUrl={m.imageUrl}
              name={m.name}
              className="home-mol-glyph"
              fallback={<FormulaGlyph formula={m.formula} />}
            />
          ) : (
            <FormulaGlyph formula={m.formula} />
          )}
        </span>
      ))}
    </span>
  );
}
