import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import {
  buildNexafsSpectrumExportCsv,
  mapDbSpectrumRowsToPoints,
} from "~/features/process-nexafs/utils";
import {
  downloadAuxStorageObject,
  EXPERIMENT_AUX_BUCKET,
  SAMPLE_AUX_BUCKET,
} from "~/server/aux-storage";
import { buffersToTarGz, type TarGzEntry } from "~/server/nexafs/tarGzFromBuffers";

const SPECTRUM_POINT_CAP = 10_000;

function sanitizeArchiveFilename(name: string): string {
  const base = name
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(/[^\w.\-()+ ]/g, "_")
    .slice(0, 200);
  return base.length > 0 ? base : "file";
}

function auxArchivePath(folder: string, originalFilename: string): string {
  return `${folder}/${sanitizeArchiveFilename(originalFilename)}`;
}

export type DatasetAllDataBundleResult = {
  readonly buffer: Buffer;
  readonly downloadFilename: string;
};

/**
 * Builds a `.tar.gz` with the all-polarizations spectrum CSV plus committed experiment and sample auxiliary files.
 */
export async function buildDatasetAllDataBundle(
  db: PrismaClient,
  experimentId: string,
): Promise<DatasetAllDataBundleResult> {
  const experiment = await db.experiments.findUnique({
    where: { id: experimentId },
    select: {
      id: true,
      samples: {
        select: {
          id: true,
          molecules: { select: { chemicalformula: true } },
        },
      },
    },
  });

  if (!experiment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Experiment not found",
    });
  }

  const sampleId = experiment.samples?.id ?? null;
  const chemicalFormula =
    experiment.samples?.molecules?.chemicalformula?.trim() ?? null;

  const spectrumRows = await db.spectrumpoints.findMany({
    where: { experimentid: experimentId },
    orderBy: { energyev: "asc" },
    take: SPECTRUM_POINT_CAP,
    include: {
      polarizations: {
        select: { polardeg: true, azimuthdeg: true },
      },
    },
  });

  const points = mapDbSpectrumRowsToPoints(spectrumRows);
  const csvResult = await buildNexafsSpectrumExportCsv(points, {
    stoichiometryFormula: chemicalFormula,
    includeBareAtom: false,
  });

  const entries: TarGzEntry[] = [
    {
      path: "spectrum-all-polarizations.csv",
      data: Buffer.from(csvResult.csv, "utf-8"),
    },
  ];

  const experimentAuxRows = await db.experimentfile.findMany({
    where: {
      experimentid: experimentId,
      deletedat: null,
      committedat: { not: null },
    },
    orderBy: { createdat: "asc" },
  });

  for (const row of experimentAuxRows) {
    const data = await downloadAuxStorageObject({
      bucket: EXPERIMENT_AUX_BUCKET,
      path: row.storagepath,
    });
    entries.push({
      path: auxArchivePath("experiment-aux", row.originalfilename),
      data,
    });
  }

  if (sampleId) {
    const sampleAuxRows = await db.samplefile.findMany({
      where: {
        sampleid: sampleId,
        deletedat: null,
        committedat: { not: null },
      },
      orderBy: { createdat: "asc" },
    });

    for (const row of sampleAuxRows) {
      const data = await downloadAuxStorageObject({
        bucket: SAMPLE_AUX_BUCKET,
        path: row.storagepath,
      });
      entries.push({
        path: auxArchivePath("sample-aux", row.originalfilename),
        data,
      });
    }
  }

  const buffer = await buffersToTarGz(entries);
  const downloadFilename = `nexafs-experiment-${experimentId.slice(0, 8)}-all-data.tar.gz`;

  return { buffer, downloadFilename };
}
