import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PrismaClient } from "~/prisma/client";
import { userMayManageAtlasTeamVerification } from "./atlasTeamVerification";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function createCapsMockDb(roleSlugs: string[], canAccessLabs: boolean): PrismaClient {
  return {
    userAppRole: {
      findMany: async () =>
        roleSlugs.map((slug) => ({
          role: {
            slug,
            permissions: canAccessLabs ? ["labs_access"] : [],
          },
        })),
    },
  } as unknown as PrismaClient;
}

describe("userMayManageAtlasTeamVerification", () => {
  it("returns false when unauthenticated", async () => {
    const allowed = await userMayManageAtlasTeamVerification(
      createCapsMockDb([], false),
      null,
    );
    expect(allowed).toBe(false);
  });

  it("allows administrator lineage without labs_access permission", async () => {
    const allowed = await userMayManageAtlasTeamVerification(
      createCapsMockDb(["administrator"], false),
      "0000-0001-2345-6789",
    );
    expect(allowed).toBe(true);
  });

  it("allows maintainer lineage without labs_access permission", async () => {
    const allowed = await userMayManageAtlasTeamVerification(
      createCapsMockDb(["maintainer"], false),
      "0000-0001-2345-6789",
    );
    expect(allowed).toBe(true);
  });

  it("denies contributor lineage without labs_access", async () => {
    const allowed = await userMayManageAtlasTeamVerification(
      createCapsMockDb(["contributor"], false),
      "0000-0001-2345-6789",
    );
    expect(allowed).toBe(false);
  });

  it("allows custom roles with labs_access", async () => {
    const allowed = await userMayManageAtlasTeamVerification(
      createCapsMockDb(["beamtime_lead"], true),
      "0000-0001-2345-6789",
    );
    expect(allowed).toBe(true);
  });
});
