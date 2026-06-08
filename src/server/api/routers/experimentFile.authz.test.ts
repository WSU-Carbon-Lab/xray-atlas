import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import { assertUserMayEditExperiment } from "~/server/nexafs/experimentEditAuthz";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (
  name: string,
  fn: () => void | Promise<void>,
) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const OWNER_ORCID = "0000-0001-2345-6789";
const STRANGER_ORCID = "0000-0003-2345-6789";
const EXPERIMENT_ID = "11111111-1111-4111-8111-111111111111";

function createAuthzMockDb(): PrismaClient {
  return {
    experiments: {
      findUnique: async () => ({ createdby: OWNER_ORCID }),
    },
    experimentcontributors: {
      findMany: async () => [
        {
          orcidid: OWNER_ORCID,
          role: "DataCurator",
          detachedat: null,
          isclaimed: true,
          userid: OWNER_ORCID,
        },
      ],
    },
    userAppRole: {
      findMany: async () => [],
    },
  } as unknown as PrismaClient;
}

describe("experimentFile aux access gate", () => {
  it("requires experiment edit rights for contributor list and getDownloadUrl", async () => {
    const db = createAuthzMockDb();
    await assertUserMayEditExperiment(db, OWNER_ORCID, EXPERIMENT_ID);
    let forbidden = false;
    try {
      await assertUserMayEditExperiment(db, STRANGER_ORCID, EXPERIMENT_ID);
    } catch (error) {
      forbidden = error instanceof TRPCError && error.code === "FORBIDDEN";
    }
    expect(forbidden).toBe(true);
  });
});
