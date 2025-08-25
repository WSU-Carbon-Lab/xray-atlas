import React, { Suspense } from "react";
import { MoleculeDisplay } from "~/app/_components/molecule";
import { getMolecule } from "~/server/queries";
import { Skeleton } from "~/app/_components/ui/skeleton";
import Link from "next/link";
import { Molecule } from "~/server/db";

const cutoffLongString = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};

async function InterpretingCardContent() {
  const y11Molecule: Molecule = await getMolecule("Y6");
  return (
    <div className="mt-6 flex flex-col gap-10 md:flex-row md:items-start">
      {/* Left: Molecule card */}
      <div className="md:min-w-[280px]">
        <MoleculeDisplay molecule={y11Molecule} />
      </div>

      {/* Right: Explanations */}
      <div className="max-w-prose">
        <h3 className="mb-3 text-lg font-semibold">How to Read This Card</h3>
        <ul className="space-y-3 text-sm leading-relaxed">
          <li>
            <strong>2D Structure:</strong> The 2D structure provides a visual
            representation of the molecule. Atoms are color coded by their
            element following standard{" "}
            <Link
              href="https://en.wikipedia.org/wiki/CPK_coloring"
              className="text-wsu-crimson hover:underline"
            >
              CPK coloring conventions
            </Link>
            (e.g., Carbon is black, Oxygen is red).
          </li>
          <li>
            <strong>Name: ({y11Molecule.name})</strong> The first name listed
            under "Common Names" is the primary name chosen by the data
            submitter and is the primary search key for the database.
          </li>
          <li>
            <strong>Common Names: ({y11Molecule.synonyms.join(", ")})</strong>{" "}
            After the primary name, all the known synonyms for the molecule are
            listed as 'Common Names'. Clicking on the left side will display a
            modal with these common name synonyms information.
          </li>
          <li>
            <strong>Chemical Formula: ({y11Molecule.chemical_formula}):</strong>{" "}
            Shows elemental composition (uppercase letters denote elements;
            numbers are atom counts).
          </li>
          <li>
            <strong>
              Description: ({cutoffLongString(y11Molecule.description, 50)})
            </strong>{" "}
            A descriptive chemical name for the molecule as chosen by the
            submitter.
          </li>
          <li>
            <strong>
              SMILES: ({cutoffLongString(y11Molecule.SMILES, 50)})
            </strong>{" "}
            A{" "}
            <Link
              href="https://en.wikipedia.org/wiki/Simplified_molecular-input_line-entry_system"
              className="text-wsu-crimson hover:underline"
            >
              simplified molecular-input line-entry system (SMILES)
            </Link>{" "}
            representation of the molecule. For polymers this is the SMILES for
            a singular repeating unit.
          </li>
          <li>
            <strong>InChI: ({cutoffLongString(y11Molecule.InChI, 50)})</strong>{" "}
            The{" "}
            <Link
              href="https://en.wikipedia.org/wiki/IUPAC_InChI"
              className="text-wsu-crimson hover:underline"
            >
              international chemical identifier (InChI)
            </Link>{" "}
            is a textual representation of the molecule's structure. For
            polymers this is the InChI for a singular repeating unit.
          </li>
          <li>
            <strong>Card Click:</strong> Clicking the molecule card opens the
            detailed page with full spectra, metadata, and downloadable
            resources.
          </li>
        </ul>
      </div>
    </div>
  );
}

function InterpretingCardSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-start">
      <div className="md:min-w-[280px]">
        <Skeleton className="h-[400px] w-full" />
      </div>
      <div className="max-w-prose">
        <Skeleton className="mb-3 h-7 w-48" />
        <ul className="space-y-3 text-sm leading-relaxed">
          <li>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-4 w-full" />
            <Skeleton className="mt-1 h-4 w-5/6" />
          </li>
          <li>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
          <li>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1 h-4 w-full" />
          </li>
        </ul>
      </div>
    </div>
  );
}

export function InterpretingCard() {
  return (
    <Suspense fallback={<InterpretingCardSkeleton />}>
      <InterpretingCardContent />
    </Suspense>
  );
}
