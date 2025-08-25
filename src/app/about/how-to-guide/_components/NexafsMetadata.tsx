import React, { Suspense } from "react";
import { NexafsTable } from "~/app/_components/nexafs-table";
import { getMolecule } from "~/server/queries";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { Molecule } from "~/server/db";

async function NexafsMetadataContent() {
  const y6Molecule: Molecule = await getMolecule("Y6");
  return (
    <>
      <div className="mb-4">
        <p className="mb-4">
          Below is a quick reference for the columns in the NEXAFS spectra
          table. Each card explains what the corresponding column is telling
          you.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Edge</h4>
            <p className="text-sm">
              The targeted atom (e.g. C N, S, ...) and core-level absorption
              edge (e.g., K, L1, L2, M1) indicating which element / core orbital
              transition the spectrum probes.
            </p>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Method</h4>
            <p className="text-sm">
              Detection mode or yield type (e.g., TEY, FY, Transmission)
              describing how the signal was collected, which can influence
              surface / bulk sensitivity.
            </p>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Facility</h4>
            <p className="text-sm">
              The name of the synchrotron facility or scientific institute where
              the experiment was conducted.
            </p>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Instrument</h4>
            <p className="text-sm">
              The specific instrument / beamline used to collect the NEXAFS
              data, including details like the beamline and any relevant
              configurations.
            </p>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Source</h4>
            <p className="text-sm">
              Source/vendor of the raw materials used to make the measurand
              material.
            </p>
          </div>
          <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <h4 className="mb-1 font-semibold">Group</h4>
            <p className="text-sm">
              Scientific research group or laboratory that conducted the
              experiment.
            </p>
          </div>
        </div>
      </div>
      <p>
        In the table below, each row corresponds to a unique NEXAFS spectrum
        collected from a specific sample of the molecule Y6. Each column
        provides information about the experimental conditions and results.
      </p>
      <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-start">
        <NexafsTable molecule={y6Molecule} />
      </div>
      <p>
        Selecting a row will open a more detailed view of the spectrum,
        including the spectrum plot, raw data download, and experimental notes.
      </p>
    </>
  );
}

function NexafsMetadataSkeleton() {
  return (
    <>
      <div className="mb-4">
        <Skeleton className="h-6 w-3/4" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40"
            >
              <Skeleton className="mb-2 h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </>
  );
}

export function NexafsMetadata() {
  return (
    <Suspense fallback={<NexafsMetadataSkeleton />}>
      <NexafsMetadataContent />
    </Suspense>
  );
}
