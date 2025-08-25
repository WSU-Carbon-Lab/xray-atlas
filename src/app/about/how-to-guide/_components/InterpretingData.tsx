import React, { Suspense } from "react";
import { getDataSet, getMolecule } from "~/server/queries";
import { Skeleton } from "~/app/_components/ui/skeleton";
import { NexafsPlot } from "~/app/_components/nexafs-plot";
import { RenderExperimentDetails } from "~/app/_components/nexafs-table";

async function InterpretingDataContent() {
  const molecule = await getMolecule("Y6");
  if (!molecule.data?.[0]) {
    return <div>No experiment data available for this molecule.</div>;
  }
  const dataSet = await getDataSet("Y6", molecule.data[0]);

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-xl font-semibold">Interpreting the Data</h2>{" "}
      <div className="grid flex-grow grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <h5 className="mb-1 font-semibold">User Information</h5>
          <p className="text-sm">
            Identifies the submitting researcher(s):{" "}
            <strong>name, affiliation</strong>, and an<strong> email</strong>{" "}
            contact. This provides accountability and a point of contact for
            questions about the data.
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <h5 className="mb-1 font-semibold">Instrument Details</h5>
          <p className="text-sm">
            Describes <strong>facility, beamline / instrument</strong>, and{" "}
            <strong>technique</strong> (TEY, FY, Transmission, etc.) used to
            collect the data. This exists to provide context on the experimental
            setup.
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <h5 className="mb-1 font-semibold">Experiment Details</h5>
          <p className="text-sm">
            Describes the targeted <strong>absorption edge</strong> targeted by
            the experiment, in addition to scan parameters like the{" "}
            <strong>polar angles</strong> and
            <strong>azimuth angles</strong>. These are described as the angle
            between the electric field vector of the incident X-rays and the
            surface normal. An azimuthal angle of zero assumes NEXAFS was
            collected in only p-polarization.
          </p>
        </div>
        <div className="rounded border border-neutral-300 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
          <h5 className="mb-1 font-semibold">Sample Information</h5>
          <p className="text-sm">
            In particular this calls out the vendor that supplied the material,
            and the preparation method (spin coating, vapor deposition, etc).
            More details can be found by downloading the raw JSON.
          </p>
        </div>
      </div>
      <p className="mb-4 mt-6">
        Below is an example experiment collected on the molecule Y6. Each
        section provides detailed information about the experimental setup and
        conditions.
      </p>
      <RenderExperimentDetails
        dataSet={dataSet}
        experiment={molecule.data[0]}
      />
      <p className="mb-4">
        The plot above shows the NEXAFS spectra for the selected molecule. You
        can interact with the plot by zooming in on specific regions to get a
        more detailed view. Click and drag to select an area to zoom into, and
        use the "Zoom Out" button to return to the full view.
      </p>
    </div>
  );
}

function InterpretingDataSkeleton() {
  return (
    <div className="mt-6">
      <Skeleton className="mb-4 h-12 w-full" />
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}

export function InterpretingData() {
  return (
    <Suspense fallback={<InterpretingDataSkeleton />}>
      <InterpretingDataContent />
    </Suspense>
  );
}
