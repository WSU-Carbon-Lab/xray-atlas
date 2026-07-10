import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PrismaClient } from "~/prisma/client";
import { mintExperimentDatasetDoi } from "~/server/zenodo/mint-experiment-dataset-doi";
import type { ZenodoClient, ZenodoDeposition } from "~/server/zenodo/zenodo-client";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeNull: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (
  name: string,
  fn: () => void | Promise<void>,
) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "22222222-2222-2222-2222-222222222222";

function publishedDeposition(): ZenodoDeposition {
  return {
    id: 55,
    doi: "10.5072/zenodo.55",
    state: "done",
    submitted: true,
    record_id: 55,
    links: {
      self: "https://sandbox.zenodo.org/api/deposit/depositions/55",
      bucket: "https://sandbox.zenodo.org/api/files/bucket-55",
      html: "https://sandbox.zenodo.org/records/55",
    },
  };
}

function createMockDb(options?: {
  existingDeposit?: {
    state: "pending" | "depositing" | "published" | "failed";
    doi: string | null;
    recordurl: string | null;
    zenododepositionid: number | null;
  } | null;
}) {
  const depositRow = {
    current: options?.existingDeposit ?? null,
  };
  const metrics = {
    datasetdoi: null as string | null,
    hasdatasetdoi: false,
  };

  const db = {
    experimentzenododeposits: {
      findUnique: async () => depositRow.current,
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        if (!depositRow.current) {
          depositRow.current = {
            state: (create.state as NonNullable<typeof depositRow.current>["state"]) ?? "depositing",
            doi: (create.doi as string | null | undefined) ?? null,
            recordurl: (create.recordurl as string | null | undefined) ?? null,
            zenododepositionid:
              (create.zenododepositionid as number | null | undefined) ?? null,
          };
        } else {
          depositRow.current = {
            ...depositRow.current,
            state:
              (update.state as typeof depositRow.current.state) ??
              depositRow.current.state,
            doi:
              update.doi === undefined
                ? depositRow.current.doi
                : (update.doi as string | null),
            recordurl:
              update.recordurl === undefined
                ? depositRow.current.recordurl
                : (update.recordurl as string | null),
            zenododepositionid:
              update.zenododepositionid === undefined
                ? depositRow.current.zenododepositionid
                : (update.zenododepositionid as number | null),
          };
        }
        return depositRow.current;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        depositRow.current ??= {
          state: "depositing",
          doi: null,
          recordurl: null,
          zenododepositionid: null,
        };
        depositRow.current = {
          ...depositRow.current,
          state:
            (data.state as typeof depositRow.current.state) ??
            depositRow.current.state,
          doi:
            data.doi === undefined
              ? depositRow.current.doi
              : (data.doi as string | null),
          recordurl:
            data.recordurl === undefined
              ? depositRow.current.recordurl
              : (data.recordurl as string | null),
          zenododepositionid:
            data.zenododepositionid === undefined
              ? depositRow.current.zenododepositionid
              : (data.zenododepositionid as number | null),
        };
        return depositRow.current;
      },
    },
    experiments: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (where.id !== EXPERIMENT_ID) return null;
        return {
          id: EXPERIMENT_ID,
          canonicalslug: "demo-c-k-tey-1",
          experimenttype: "TOTAL_ELECTRON_YIELD",
          edges: { targetatom: "C", corestate: "K" },
          instruments: {
            name: "5.3.2.2",
            facilities: { name: "ALS" },
          },
          samples: {
            molecules: {
              iupacname: "Polystyrene",
              chemicalformula: "C8H8",
              moleculesynonyms: [{ synonym: "PS", order: 0 }],
            },
          },
          experimentcontributors: [
            {
              orcidid: "0000-0002-1825-0097",
              role: "DataCurator",
              user: { name: "Jane Doe", id: "0000-0002-1825-0097" },
            },
          ],
          experimentpublications: [
            { publications: { doi: "10.1000/source" } },
          ],
        };
      },
    },
    experimentmetrics: {
      upsert: async ({
        create,
        update,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        metrics.datasetdoi =
          (update.datasetdoi as string | null | undefined) ??
          (create.datasetdoi as string | null | undefined) ??
          null;
        metrics.hasdatasetdoi = Boolean(
          update.hasdatasetdoi ?? create.hasdatasetdoi ?? false,
        );
        return metrics;
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };

  return { db: db as unknown as PrismaClient, depositRow, metrics };
}

describe("mintExperimentDatasetDoi", () => {
  it("is idempotent when already published with a DOI", async () => {
    const { db } = createMockDb({
      existingDeposit: {
        state: "published",
        doi: "10.5072/zenodo.1",
        recordurl: "https://sandbox.zenodo.org/records/1",
        zenododepositionid: 1,
      },
    });

    const result = await mintExperimentDatasetDoi(db, EXPERIMENT_ID, {
      client: {
        createDeposition: async () => {
          throw new Error("should not create");
        },
      } as unknown as ZenodoClient,
    });

    expect(result.state).toBe("published");
    expect(result.doi).toBe("10.5072/zenodo.1");
  });

  it("publishes and updates metrics on success", async () => {
    const { db, metrics } = createMockDb();
    const client = {
      createDeposition: async () => publishedDeposition(),
      updateDepositionMetadata: async () => publishedDeposition(),
      uploadBucketFile: async () => undefined,
      publishDeposition: async () => publishedDeposition(),
      editDeposition: async () => publishedDeposition(),
      getDeposition: async () => publishedDeposition(),
      newVersionDeposition: async () => publishedDeposition(),
      listDepositionFiles: async () => [],
      deleteDepositionFile: async () => undefined,
    } as unknown as ZenodoClient;

    const result = await mintExperimentDatasetDoi(db, EXPERIMENT_ID, {
      client,
      pollAttempts: 2,
      pollDelayMs: 0,
      sleep: async () => undefined,
      buildBundle: async () => ({
        buffer: Buffer.from("tar-bytes"),
        downloadFilename: "nexafs-test.tar.gz",
      }),
    });

    expect(result.state).toBe("published");
    expect(result.doi).toBe("10.5072/zenodo.55");
    expect(metrics.datasetdoi).toBe("10.5072/zenodo.55");
    expect(metrics.hasdatasetdoi).toBe(true);
  });

  it("persists failure and does not throw when Zenodo publish fails", async () => {
    const { db, depositRow } = createMockDb();
    const client = {
      createDeposition: async () => ({
        id: 9,
        links: {
          self: "https://sandbox.zenodo.org/api/deposit/depositions/9",
          bucket: "https://sandbox.zenodo.org/api/files/bucket-9",
        },
      }),
      updateDepositionMetadata: async () => ({
        id: 9,
        links: {
          self: "https://sandbox.zenodo.org/api/deposit/depositions/9",
          bucket: "https://sandbox.zenodo.org/api/files/bucket-9",
        },
      }),
      uploadBucketFile: async () => undefined,
      publishDeposition: async () => {
        throw new Error("publish exploded");
      },
      editDeposition: async () => {
        throw new Error("unused");
      },
      getDeposition: async () => {
        throw new Error("unused");
      },
      newVersionDeposition: async () => {
        throw new Error("unused");
      },
      listDepositionFiles: async () => [],
      deleteDepositionFile: async () => undefined,
    } as unknown as ZenodoClient;

    const result = await mintExperimentDatasetDoi(db, EXPERIMENT_ID, {
      client,
      sleep: async () => undefined,
      buildBundle: async () => ({
        buffer: Buffer.from("tar-bytes"),
        downloadFilename: "nexafs-test.tar.gz",
      }),
    });

    expect(result.state).toBe("failed");
    expect(result.error).toBe("publish exploded");
    expect(depositRow.current?.state).toBe("failed");
  });
});
