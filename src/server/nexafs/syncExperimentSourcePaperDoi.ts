import type { Prisma, PrismaClient } from "~/prisma/client";
import { normalizeDoi } from "~/lib/doi";
import type { PublicationCitation } from "~/lib/publication-citation";

type DbClient = PrismaClient | Prisma.TransactionClient;

type SourcePublicationRow = {
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  authors: string[];
};

function citationToAuthorsJson(
  authors: string[],
): Prisma.InputJsonValue | undefined {
  return authors.length > 0 ? (authors as unknown as Prisma.InputJsonValue) : undefined;
}

function mapPublicationRow(row: {
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  authors: unknown;
}): SourcePublicationRow {
  const authorsFromDb = Array.isArray(row.authors)
    ? row.authors.filter((item): item is string => typeof item === "string")
    : [];
  return {
    doi: row.doi,
    title: row.title,
    journal: row.journal,
    year: row.year,
    authors: authorsFromDb,
  };
}

function sortSourcePublicationRows(
  rows: SourcePublicationRow[],
): SourcePublicationRow[] {
  return [...rows].sort((a, b) => {
    const yearA = a.year ?? -1;
    const yearB = b.year ?? -1;
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    return a.title.localeCompare(b.title);
  });
}

async function upsertPublicationRecord(
  db: DbClient,
  citation: PublicationCitation,
): Promise<{ id: string; doi: string }> {
  const normalizedDoi = normalizeDoi(citation.doi);
  if (!normalizedDoi) {
    throw new Error("Source publication DOI must normalize to a canonical identifier");
  }

  const publication = await db.publications.upsert({
    where: { doi: normalizedDoi },
    create: {
      doi: normalizedDoi,
      title: citation.title,
      journal: citation.journal,
      year: citation.year,
      authors: citationToAuthorsJson(citation.authors),
    },
    update: {
      title: citation.title,
      journal: citation.journal,
      year: citation.year,
      authors: citationToAuthorsJson(citation.authors),
    },
    select: { id: true, doi: true },
  });

  return publication;
}

async function linkSourcePublication(
  db: DbClient,
  experimentId: string,
  publicationId: string,
): Promise<void> {
  await db.experimentpublications.upsert({
    where: {
      experimentid_publicationid: {
        experimentid: experimentId,
        publicationid: publicationId,
      },
    },
    create: {
      experimentid: experimentId,
      publicationid: publicationId,
      role: "source",
    },
    update: { role: "source" },
  });
}

/**
 * Lists linked source publications (`experimentpublications.role = 'source'`) for an experiment.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @returns Source publication rows ordered by year descending, then title ascending.
 */
export async function listExperimentSourcePublications(
  db: DbClient,
  experimentId: string,
): Promise<SourcePublicationRow[]> {
  const links = await db.experimentpublications.findMany({
    where: { experimentid: experimentId, role: "source" },
    include: {
      publications: {
        select: {
          doi: true,
          title: true,
          journal: true,
          year: true,
          authors: true,
        },
      },
    },
  });

  return sortSourcePublicationRows(
    links.map((link) => mapPublicationRow(link.publications)),
  );
}

/**
 * Synchronizes legacy `experiment_metrics.original_data_doi` with the primary linked source publication.
 *
 * The primary DOI is the first row returned by {@link listExperimentSourcePublications}. When no source
 * publications remain, clears `original_data_doi` and verification flags.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @returns Canonical primary source DOI, or `null` when none remain.
 */
export async function refreshExperimentPrimarySourceDoi(
  db: DbClient,
  experimentId: string,
): Promise<string | null> {
  const publications = await listExperimentSourcePublications(db, experimentId);
  const primaryDoi = publications[0]?.doi ?? null;

  await db.experimentmetrics.upsert({
    where: { experimentid: experimentId },
    create: {
      experimentid: experimentId,
      originaldatadoi: primaryDoi,
      hasoriginaldatadoi: primaryDoi != null,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
    update: {
      originaldatadoi: primaryDoi,
      hasoriginaldatadoi: primaryDoi != null,
      sourcepaperdoiverified: false,
      sourcepaperdoiverifiedat: null,
      sourcepaperdoiverifiedby: null,
    },
  });

  return primaryDoi;
}

/**
 * Links a resolved source publication to an experiment without removing existing source links.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @param citation - Resolved registry metadata for the source paper.
 * @returns Canonical primary source DOI after refresh.
 */
export async function addExperimentSourcePublication(
  db: DbClient,
  experimentId: string,
  citation: PublicationCitation,
): Promise<string | null> {
  const publication = await upsertPublicationRecord(db, citation);
  await linkSourcePublication(db, experimentId, publication.id);
  return refreshExperimentPrimarySourceDoi(db, experimentId);
}

/**
 * Removes one source publication link identified by DOI.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @param doi - Raw or canonical DOI to unlink.
 * @returns Canonical primary source DOI after refresh, or `null` when none remain.
 */
export async function removeExperimentSourcePublication(
  db: DbClient,
  experimentId: string,
  doi: string,
): Promise<string | null> {
  const normalizedDoi = normalizeDoi(doi);
  if (!normalizedDoi) {
    return refreshExperimentPrimarySourceDoi(db, experimentId);
  }

  const publication = await db.publications.findUnique({
    where: { doi: normalizedDoi },
    select: { id: true },
  });
  if (publication) {
    await db.experimentpublications.deleteMany({
      where: {
        experimentid: experimentId,
        publicationid: publication.id,
        role: "source",
      },
    });
  }

  return refreshExperimentPrimarySourceDoi(db, experimentId);
}

/**
 * Links multiple resolved source publications during ingest.
 *
 * @param db - Prisma client or transaction handle.
 * @param experimentId - Target experiment UUID.
 * @param citations - Resolved registry metadata rows; duplicates by DOI are ignored.
 */
export async function syncExperimentSourcePublications(
  db: DbClient,
  experimentId: string,
  citations: PublicationCitation[],
): Promise<void> {
  const seen = new Set<string>();
  for (const citation of citations) {
    const normalizedDoi = normalizeDoi(citation.doi);
    if (!normalizedDoi || seen.has(normalizedDoi)) {
      continue;
    }
    seen.add(normalizedDoi);
    await addExperimentSourcePublication(db, experimentId, {
      ...citation,
      doi: normalizedDoi,
    });
  }
}

/**
 * Replaces all source publication links with a single DOI (legacy single-field edit path).
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
  await clearExperimentSourcePaperDoi(db, experimentId);
  await addExperimentSourcePublication(db, experimentId, citation);
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

export type { SourcePublicationRow };
