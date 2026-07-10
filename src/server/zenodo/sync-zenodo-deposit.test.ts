import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PrismaClient } from "~/prisma/client";
import { syncZenodoDepositForExperiment } from "~/server/zenodo/sync-zenodo-deposit";
import type {
  ZenodoClient,
  ZenodoDeposition,
} from "~/server/zenodo/zenodo-client";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeNull: () => void;
  toContain: (expected: string) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "22222222-2222-2222-2222-222222222222";

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
  const experimentRow = {
    atlasdatasetid: "k7m2xq4n" as string | null,
  };

  const experimentGraph = () => ({
    id: EXPERIMENT_ID,
    atlasdatasetid: experimentRow.atlasdatasetid,
    canonicalslug: "demo-c-k-tey-1",
    experimenttype: "TOTAL_ELECTRON_YIELD",
    edges: { targetatom: "C", corestate: "K" },
    instruments: {
      name: "5.3.2.2",
      facilities: { name: "ALS" },
    },
    samples: {
      processmethod: null,
      substrate: null,
      patterninglayer: null,
      solvent: null,
      thickness: null,
      molecularweight: null,
      vendors: null,
      molecules: {
        iupacname: "Polystyrene",
        chemicalformula: "C8H8",
        moleculesynonyms: [{ synonym: "PS", slug: "ps", order: 0 }],
      },
    },
    experimentcontributors: [
      {
        orcidid: "0000-0002-1825-0097",
        role: "DataCurator",
        claimstatus: "accepted",
        user: { name: "Jane Doe", id: "0000-0002-1825-0097" },
      },
    ],
    experimentpublications: [{ publications: { doi: "10.1000/source" } }],
  });

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
            state:
              (create.state as NonNullable<
                typeof depositRow.current
              >["state"]) ?? "depositing",
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
        return experimentGraph();
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { atlasdatasetid?: string | null };
      }) => {
        if (where.id !== EXPERIMENT_ID) {
          throw new Error("not found");
        }
        if (data.atlasdatasetid !== undefined) {
          experimentRow.atlasdatasetid = data.atlasdatasetid;
        }
        return experimentGraph();
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

describe("syncZenodoDepositForExperiment", () => {
  it("delegates to mint when no published deposit exists", async () => {
    const { db, metrics } = createMockDb({ existingDeposit: null });
    const client = {
      createDeposition: async () =>
        ({
          id: 10,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/10",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-10",
          },
        }) satisfies ZenodoDeposition,
      updateDepositionMetadata: async () =>
        ({
          id: 10,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/10",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-10",
          },
        }) satisfies ZenodoDeposition,
      uploadBucketFile: async () => undefined,
      publishDeposition: async () =>
        ({
          id: 10,
          doi: "10.5072/zenodo.10",
          record_id: 10,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/10",
            html: "https://sandbox.zenodo.org/records/10",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-10",
          },
        }) satisfies ZenodoDeposition,
      getDeposition: async () =>
        ({
          id: 10,
          doi: "10.5072/zenodo.10",
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/10",
            html: "https://sandbox.zenodo.org/records/10",
          },
        }) satisfies ZenodoDeposition,
      editDeposition: async () => {
        throw new Error("edit should not run for mint path");
      },
      newVersionDeposition: async () => {
        throw new Error("newversion should not run for mint path");
      },
      listDepositionFiles: async () => [],
      deleteDepositionFile: async () => undefined,
    } as unknown as ZenodoClient;

    const result = await syncZenodoDepositForExperiment(db, EXPERIMENT_ID, {
      client,
      buildBundle: async () => ({
        buffer: Buffer.from("archive"),
        downloadFilename: "x.tar.gz",
      }),
      sleep: async () => undefined,
    });

    expect(result.state).toBe("published");
    expect(result.doi).toBe("10.5072/zenodo.10");
    expect(metrics.datasetdoi).toBe("10.5072/zenodo.10");
  });

  it("unlocks and republishes metadata for a published deposit", async () => {
    const { db, depositRow } = createMockDb({
      existingDeposit: {
        state: "published",
        doi: "10.5072/zenodo.55",
        recordurl: "https://sandbox.zenodo.org/records/55",
        zenododepositionid: 55,
      },
    });

    const calls: string[] = [];
    const client = {
      getDeposition: async () => {
        calls.push("get");
        return {
          id: 55,
          doi: "10.5072/zenodo.55",
          submitted: true,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/55",
            html: "https://sandbox.zenodo.org/records/55",
          },
        } satisfies ZenodoDeposition;
      },
      editDeposition: async () => {
        calls.push("edit");
        return {
          id: 55,
          submitted: false,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/55",
          },
        } satisfies ZenodoDeposition;
      },
      updateDepositionMetadata: async () => {
        calls.push("update");
        return {
          id: 55,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/55",
          },
        } satisfies ZenodoDeposition;
      },
      publishDeposition: async () => {
        calls.push("publish");
        return {
          id: 55,
          doi: "10.5072/zenodo.55",
          record_id: 55,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/55",
            html: "https://sandbox.zenodo.org/records/55",
          },
        } satisfies ZenodoDeposition;
      },
      newVersionDeposition: async () => {
        throw new Error("newversion should not run for metadata mode");
      },
      createDeposition: async () => {
        throw new Error("create should not run");
      },
      uploadBucketFile: async () => undefined,
      listDepositionFiles: async () => [],
      deleteDepositionFile: async () => undefined,
    } as unknown as ZenodoClient;

    const result = await syncZenodoDepositForExperiment(db, EXPERIMENT_ID, {
      client,
      mode: "metadata",
      sleep: async () => undefined,
    });

    expect(result.state).toBe("published");
    expect(result.doi).toBe("10.5072/zenodo.55");
    expect(calls).toEqual(["get", "edit", "update", "publish", "get"]);
    expect(depositRow.current?.state).toBe("published");
  });

  it("creates a new version when files mode is requested", async () => {
    const { db, depositRow, metrics } = createMockDb({
      existingDeposit: {
        state: "published",
        doi: "10.5072/zenodo.55",
        recordurl: "https://sandbox.zenodo.org/records/55",
        zenododepositionid: 55,
      },
    });

    const calls: string[] = [];
    const client = {
      newVersionDeposition: async () => {
        calls.push("newversion");
        return {
          id: 99,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/99",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-99",
          },
        } satisfies ZenodoDeposition;
      },
      updateDepositionMetadata: async () => {
        calls.push("update");
        return {
          id: 99,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/99",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-99",
          },
        } satisfies ZenodoDeposition;
      },
      listDepositionFiles: async () => {
        calls.push("list");
        return [{ id: "old-file", filename: "old.tar.gz" }];
      },
      deleteDepositionFile: async () => {
        calls.push("delete");
      },
      uploadBucketFile: async () => {
        calls.push("upload");
      },
      publishDeposition: async () => {
        calls.push("publish");
        return {
          id: 99,
          doi: "10.5072/zenodo.99",
          record_id: 99,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/99",
            html: "https://sandbox.zenodo.org/records/99",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-99",
          },
        } satisfies ZenodoDeposition;
      },
      getDeposition: async () => {
        calls.push("get");
        return {
          id: 99,
          doi: "10.5072/zenodo.99",
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/99",
            html: "https://sandbox.zenodo.org/records/99",
          },
        } satisfies ZenodoDeposition;
      },
      editDeposition: async () => {
        throw new Error("edit should not run for files mode");
      },
      createDeposition: async () => {
        throw new Error("create should not run");
      },
    } as unknown as ZenodoClient;

    const result = await syncZenodoDepositForExperiment(db, EXPERIMENT_ID, {
      client,
      mode: "files",
      buildBundle: async () => ({
        buffer: Buffer.from("new-archive"),
        downloadFilename: "x.tar.gz",
      }),
      sleep: async () => undefined,
    });

    expect(result.state).toBe("published");
    expect(result.doi).toBe("10.5072/zenodo.99");
    expect(result.zenodoDepositionId).toBe(99);
    expect(metrics.datasetdoi).toBe("10.5072/zenodo.99");
    expect(depositRow.current?.zenododepositionid).toBe(99);
    expect(calls).toEqual([
      "newversion",
      "update",
      "list",
      "delete",
      "upload",
      "publish",
      "get",
    ]);
  });
});
