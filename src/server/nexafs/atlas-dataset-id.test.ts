/**
 * Unit tests for CAS-only Atlas dataset id assignment.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PrismaClient } from "~/prisma/client";
import { ensureAtlasDatasetId } from "~/server/nexafs/atlas-dataset-id";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "22222222-2222-2222-2222-222222222222";

describe("ensureAtlasDatasetId", () => {
  it("does not overwrite an existing atlas_dataset_id", async () => {
    let atlasdatasetid: string | null = "k7m2xq4n";
    let updateManyCalls = 0;
    const db = {
      experiments: {
        findUnique: async () => ({ atlasdatasetid }),
        updateMany: async () => {
          updateManyCalls += 1;
          return { count: 0 };
        },
      },
    } as unknown as PrismaClient;

    const id = await ensureAtlasDatasetId(db, EXPERIMENT_ID);
    expect(id).toBe("k7m2xq4n");
    expect(updateManyCalls).toBe(0);
  });

  it("assigns only when atlas_dataset_id is null (CAS)", async () => {
    let atlasdatasetid: string | null = null;
    const db = {
      experiments: {
        findUnique: async () => ({ atlasdatasetid }),
        updateMany: async ({
          where,
          data,
        }: {
          where: { id: string; atlasdatasetid: null };
          data: { atlasdatasetid: string };
        }) => {
          if (where.atlasdatasetid !== null) return { count: 0 };
          if (atlasdatasetid != null) return { count: 0 };
          atlasdatasetid = data.atlasdatasetid;
          return { count: 1 };
        },
      },
    } as unknown as PrismaClient;

    const id = await ensureAtlasDatasetId(db, EXPERIMENT_ID);
    expect(id.length).toBe(8);
    expect(atlasdatasetid).toBe(id);
  });
});
