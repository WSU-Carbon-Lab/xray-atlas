import type { ReactElement } from "react";
import Link from "next/link";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import type {
  HomeSnapshotLink,
  HomeSnapshotMolecule,
  HomeSnapshotSpectrum,
} from "../snapshot/types";

function collectionLine(
  spectrum: HomeSnapshotSpectrum,
  link: HomeSnapshotLink | undefined,
): string {
  if (!link) return `${spectrum.title}.`;
  return `${spectrum.title} at ${link.instrument}, ${link.facility}.`;
}

/**
 * Provenance snapshot for the home Provenance feature.
 *
 * Shows one curated measurement: the molecule, where it was collected, and
 * the pieces that stay on the record. It does not load preparation values,
 * contributor rows, or a DOI.
 */
export function HomeProvenancePanel({
  spectrum,
  molecule,
}: {
  spectrum: HomeSnapshotSpectrum;
  molecule: HomeSnapshotMolecule;
}): ReactElement {
  const href = `/molecules/${spectrum.moleculeSlug}?nexafsExperiment=${spectrum.experimentId}`;
  const collected = molecule.links.find(
    (link) => link.experimentId === spectrum.experimentId,
  );
  const pieces = [
    {
      title: "Sample",
      body: "Substrate, solvent, thickness, and patterning stay on the sample.",
    },
    {
      title: "Collection",
      body: collectionLine(spectrum, collected),
    },
    {
      title: "Analysis",
      body: "The normalization windows used for this spectrum stay with it.",
    },
    {
      title: "Raw data",
      body: "The measured signal is kept beside the processed trace.",
    },
    {
      title: "Calculated",
      body: "Optical constants share this spectrum's energy axis.",
    },
    {
      title: "Papers",
      body: "Source publications stay linked from this dataset.",
    },
  ] as const;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={`/molecules/${molecule.slug}`}
          className="bg-surface flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg"
        >
          {molecule.imageUrl ? (
            <MoleculeImageSVG
              imageUrl={molecule.imageUrl}
              name={molecule.name}
              className="home-mol-glyph"
              fallback={
                <span className="text-muted text-[0.625rem]">
                  {molecule.formula}
                </span>
              }
            />
          ) : (
            <span className="text-muted text-[0.625rem]">
              {molecule.formula}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">
            {molecule.name}
          </p>
          <p className="text-muted truncate font-mono text-xs">
            {molecule.formula}
          </p>
          <p className="text-muted truncate text-sm">{spectrum.title}</p>
        </div>
        <Link href={href} className="text-accent shrink-0 text-sm font-medium">
          Open this dataset
        </Link>
      </div>
      <dl className="divide-border mt-4 flex min-h-0 flex-1 flex-col divide-y">
        {pieces.map((piece) => (
          <div
            key={piece.title}
            className="grid min-h-0 flex-1 grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-x-6"
          >
            <dt className="text-foreground text-sm font-medium">
              {piece.title}
            </dt>
            <dd className="text-muted text-sm leading-6">{piece.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
