import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { Prisma, PrismaClient } from "~/prisma/client";
import type { PublicationCitation } from "~/lib/publication-citation";
import {
  addExperimentSourcePublication,
  clearExperimentSourcePaperDoi,
  listExperimentSourcePublications,
  refreshExperimentPrimarySourceDoi,
  removeExperimentSourcePublication,
  syncExperimentSourcePublications,
  syncExperimentSourcePaperDoi,
} from "./syncExperimentSourcePaperDoi";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

type PublicationRecord = {
  id: string;
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  authors: unknown;
};

type ExperimentPublicationLink = {
  experimentid: string;
  publicationid: string;
  role: string;
};

type MetricsRecord = {
  experimentid: string;
  originaldatadoi: string | null;
  hasoriginaldatadoi: boolean;
  sourcepaperdoiverified: boolean;
  sourcepaperdoiverifiedat: Date | null;
  sourcepaperdoiverifiedby: string | null;
};

function citation(
  doi: string,
  title: string,
  year: number,
): PublicationCitation {
  return {
    doi,
    title,
    journal: "Journal",
    year,
    authors: ["Ada Lovelace"],
  };
}

function createMockDb() {
  const publications = new Map<string, PublicationRecord>();
  const links: ExperimentPublicationLink[] = [];
  const metrics = new Map<string, MetricsRecord>();
  let publicationCounter = 0;

  const db = {
    publications: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { doi: string };
        create: Omit<PublicationRecord, "id">;
        update: Partial<Omit<PublicationRecord, "id" | "doi">>;
      }) => {
        const existing = publications.get(where.doi);
        if (existing) {
          Object.assign(existing, update);
          return { id: existing.id, doi: existing.doi };
        }
        publicationCounter += 1;
        const record: PublicationRecord = {
          id: `pub-${publicationCounter}`,
          doi: create.doi,
          title: create.title,
          journal: create.journal,
          year: create.year,
          authors: create.authors ?? null,
        };
        publications.set(where.doi, record);
        return { id: record.id, doi: record.doi };
      },
      findUnique: async ({
        where,
        select,
      }: {
        where: { doi: string };
        select: { id: true };
      }) => {
        const record = publications.get(where.doi);
        if (!record) {
          return null;
        }
        return { id: record.id };
      },
    },
    experimentpublications: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: {
          experimentid_publicationid: {
            experimentid: string;
            publicationid: string;
          };
        };
        create: ExperimentPublicationLink;
        update: Partial<ExperimentPublicationLink>;
      }) => {
        const key = `${where.experimentid_publicationid.experimentid}:${where.experimentid_publicationid.publicationid}`;
        const existingIndex = links.findIndex(
          (link) =>
            `${link.experimentid}:${link.publicationid}` === key,
        );
        if (existingIndex >= 0) {
          links[existingIndex] = {
            ...links[existingIndex]!,
            ...update,
          };
          return links[existingIndex];
        }
        links.push({ ...create, ...update });
        return create;
      },
      findMany: async ({
        where,
        include,
      }: {
        where: { experimentid: string; role: string };
        include: {
          publications: {
            select: {
              doi: true;
              title: true;
              journal: true;
              year: true;
              authors: true;
            };
          };
        };
      }) => {
        return links
          .filter(
            (link) =>
              link.experimentid === where.experimentid &&
              link.role === where.role,
          )
          .map((link) => {
            const publication = [...publications.values()].find(
              (row) => row.id === link.publicationid,
            );
            if (!publication) {
              throw new Error("Missing publication for link");
            }
            return {
              publications: {
                doi: publication.doi,
                title: publication.title,
                journal: publication.journal,
                year: publication.year,
                authors: publication.authors,
              },
            };
          });
      },
      deleteMany: async ({
        where,
      }: {
        where: {
          experimentid: string;
          publicationid?: string;
          role?: string;
        };
      }) => {
        for (let index = links.length - 1; index >= 0; index -= 1) {
          const link = links[index]!;
          if (link.experimentid !== where.experimentid) {
            continue;
          }
          if (where.publicationid && link.publicationid !== where.publicationid) {
            continue;
          }
          if (where.role && link.role !== where.role) {
            continue;
          }
          links.splice(index, 1);
        }
        return { count: 0 };
      },
    },
    experimentmetrics: {
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { experimentid: string };
        create: MetricsRecord;
        update: Partial<MetricsRecord>;
      }) => {
        const existing = metrics.get(where.experimentid);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        const record = { ...create };
        metrics.set(where.experimentid, record);
        return record;
      },
    },
  };

  return {
    db: db as unknown as PrismaClient,
    publications,
    links,
    metrics,
  };
}

describe("syncExperimentSourcePaperDoi", () => {
  it("adds multiple source publications without replacing existing links", async () => {
    const { db } = createMockDb();
    const experimentId = "00000000-0000-4000-8000-000000000001";

    await addExperimentSourcePublication(
      db,
      experimentId,
      citation("10.1000/paper-a", "Paper A", 2024),
    );
    await addExperimentSourcePublication(
      db,
      experimentId,
      citation("10.1000/paper-b", "Paper B", 2023),
    );

    const rows = await listExperimentSourcePublications(db, experimentId);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.doi).toBe("10.1000/paper-a");
    expect(rows[1]?.doi).toBe("10.1000/paper-b");
  });

  it("sets primary original_data_doi to newest source publication", async () => {
    const { db, metrics } = createMockDb();
    const experimentId = "00000000-0000-4000-8000-000000000002";

    await syncExperimentSourcePublications(db, experimentId, [
      citation("10.1000/older", "Older", 2019),
      citation("10.1000/newer", "Newer", 2024),
    ]);

    const primary = await refreshExperimentPrimarySourceDoi(db, experimentId);
    expect(primary).toBe("10.1000/newer");
    expect(metrics.get(experimentId)?.originaldatadoi).toBe("10.1000/newer");
  });

  it("removeExperimentSourcePublication refreshes primary doi", async () => {
    const { db, metrics } = createMockDb();
    const experimentId = "00000000-0000-4000-8000-000000000003";

    await syncExperimentSourcePublications(db, experimentId, [
      citation("10.1000/keep", "Keep", 2022),
      citation("10.1000/remove", "Remove", 2025),
    ]);

    await removeExperimentSourcePublication(db, experimentId, "10.1000/remove");

    const rows = await listExperimentSourcePublications(db, experimentId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.doi).toBe("10.1000/keep");
    expect(metrics.get(experimentId)?.originaldatadoi).toBe("10.1000/keep");
  });

  it("syncExperimentSourcePaperDoi replaces all source links with one doi", async () => {
    const { db } = createMockDb();
    const experimentId = "00000000-0000-4000-8000-000000000004";

    await syncExperimentSourcePublications(db, experimentId, [
      citation("10.1000/old-one", "Old One", 2020),
      citation("10.1000/old-two", "Old Two", 2021),
    ]);

    await syncExperimentSourcePaperDoi(
      db,
      experimentId,
      citation("10.1000/replacement", "Replacement", 2024),
    );

    const rows = await listExperimentSourcePublications(db, experimentId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.doi).toBe("10.1000/replacement");
  });

  it("clearExperimentSourcePaperDoi removes all source links and metrics doi", async () => {
    const { db, metrics, links } = createMockDb();
    const experimentId = "00000000-0000-4000-8000-000000000005";

    await syncExperimentSourcePublications(db, experimentId, [
      citation("10.1000/clear-me", "Clear Me", 2024),
    ]);
    await clearExperimentSourcePaperDoi(db, experimentId);

    const rows = await listExperimentSourcePublications(db, experimentId);
    expect(rows).toHaveLength(0);
    expect(metrics.get(experimentId)?.originaldatadoi).toBe(null);
    expect(links).toHaveLength(0);
  });
});
