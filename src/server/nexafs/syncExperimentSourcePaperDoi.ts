import type { Prisma, PrismaClient } from "~/prisma/client";
import type { PublicationCitation } from "~/lib/publication-citation";

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Upserts `experiment_metrics.original_data_doi` and links a `publications` row with role `source`.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @param citation - Resolved registry metadata for the source paper.
 */
export async function syncExperimentSourcePaperDoi(
  db: DbClient,
  experimentId: string,
  citation: PublicationCitation,
): Promise<void> {
  await db.experimentmetrics.upsert({
    where: { experimentid: experimentId },
    create: {
      experimentid: experimentId,
      originaldatadoi: citation.doi,
      hasoriginaldatadoi: true,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
    update: {
      originaldatadoi: citation.doi,
      hasoriginaldatadoi: true,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
  });

  const publication = await db.publications.upsert({
    where: { doi: citation.doi },
    create: {
      doi: citation.doi,
      title: citation.title,
      journal: citation.journal,
      year: citation.year,
      authors:
        citation.authors.length > 0
          ? (citation.authors as unknown as Prisma.InputJsonValue)
          : undefined,
    },
    update: {
      title: citation.title,
      journal: citation.journal,
      year: citation.year,
      authors:
        citation.authors.length > 0
          ? (citation.authors as unknown as Prisma.InputJsonValue)
          : undefined,
    },
    select: { id: true },
  });

  await db.experimentpublications.deleteMany({
    where: { experimentid: experimentId, role: "source" },
  });

  await db.experimentpublications.upsert({
    where: {
      experimentid_publicationid: {
        experimentid: experimentId,
        publicationid: publication.id,
      },
    },
    create: {
      experimentid: experimentId,
      publicationid: publication.id,
      role: "source",
    },
    update: { role: "source" },
  });
}

/**
 * Clears ingest-time source paper DOI fields and removes `experimentpublications` rows with role `source`.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 */
export async function clearExperimentSourcePaperDoi(
  db: DbClient,
  experimentId: string,
): Promise<void> {
  await db.experimentmetrics.upsert({
    where: { experimentid: experimentId },
    create: {
      experimentid: experimentId,
      originaldatadoi: null,
      hasoriginaldatadoi: false,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
    update: {
      originaldatadoi: null,
      hasoriginaldatadoi: false,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
  });

  await db.experimentpublications.deleteMany({
    where: { experimentid: experimentId, role: "source" },
  });
}
