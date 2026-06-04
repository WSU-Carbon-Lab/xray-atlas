import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { Prisma, type PrismaClient } from "~/prisma/client";
import {
  checkAuthenticatedTrackViewThrottle,
  recordMoleculeView,
} from "./record-molecule-view";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const MOLECULE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ORCID = "0000-0001-2345-6789";

type ViewRow = {
  id: string;
  moleculeid: string;
  userid: string | null;
  sessionid: string | null;
};

function createMockDb(config: {
  moleculeExists?: boolean;
  existingViews?: ViewRow[];
  createThrowsUnique?: boolean;
}): PrismaClient {
  const views = [...(config.existingViews ?? [])];
  let viewcount = 0;

  return {
    molecules: {
      findUnique: async () =>
        config.moleculeExists === false ? null : { id: MOLECULE_ID },
      update: async ({
        data,
      }: {
        data: { viewcount?: { increment: number } };
      }) => {
        if (data.viewcount?.increment) {
          viewcount += data.viewcount.increment;
        }
        return { id: MOLECULE_ID, viewcount };
      },
    },
    moleculeviews: {
      findFirst: async ({
        where,
      }: {
        where: { moleculeid: string; userid: string };
      }) =>
        views.find(
          (v) =>
            v.moleculeid === where.moleculeid && v.userid === where.userid,
        ) ?? null,
      create: async ({
        data,
      }: {
        data: {
          moleculeid: string;
          userid: string;
          sessionid: string | null;
        };
      }) => {
        if (config.createThrowsUnique) {
          throw new Prisma.PrismaClientKnownRequestError(
            "Unique constraint failed",
            {
              code: "P2002",
              clientVersion: "test",
            },
          );
        }
        const row: ViewRow = {
          id: crypto.randomUUID(),
          moleculeid: data.moleculeid,
          userid: data.userid,
          sessionid: data.sessionid,
        };
        views.push(row);
        return row;
      },
    },
  } as unknown as PrismaClient;
}

describe("recordMoleculeView", () => {
  it("skips anonymous callers without writes", async () => {
    const db = createMockDb({ moleculeExists: true });
    const result = await recordMoleculeView(db, {
      moleculeId: MOLECULE_ID,
      userId: null,
    });
    expect(result).toEqual({
      recorded: false,
      skipReason: "unauthenticated",
    });
  });

  it("records the first authenticated view per user and molecule", async () => {
    const db = createMockDb({ moleculeExists: true });
    const result = await recordMoleculeView(db, {
      moleculeId: MOLECULE_ID,
      userId: USER_ORCID,
    });
    expect(result).toEqual({ recorded: true });
  });

  it("dedupes repeat views for the same user and molecule", async () => {
    const db = createMockDb({
      moleculeExists: true,
      existingViews: [
        {
          id: "view-1",
          moleculeid: MOLECULE_ID,
          userid: USER_ORCID,
          sessionid: null,
        },
      ],
    });
    const result = await recordMoleculeView(db, {
      moleculeId: MOLECULE_ID,
      userId: USER_ORCID,
    });
    expect(result).toEqual({
      recorded: false,
      skipReason: "duplicate",
    });
  });

  it("treats concurrent unique violations as duplicate without incrementing", async () => {
    const db = createMockDb({
      moleculeExists: true,
      createThrowsUnique: true,
    });
    const result = await recordMoleculeView(db, {
      moleculeId: MOLECULE_ID,
      userId: USER_ORCID,
    });
    expect(result).toEqual({
      recorded: false,
      skipReason: "duplicate",
    });
  });

  it("returns not_found when the molecule is missing", async () => {
    const db = createMockDb({ moleculeExists: false });
    const result = await recordMoleculeView(db, {
      moleculeId: MOLECULE_ID,
      userId: USER_ORCID,
    });
    expect(result).toEqual({
      recorded: false,
      skipReason: "not_found",
    });
  });
});

describe("checkAuthenticatedTrackViewThrottle", () => {
  it("allows up to five calls per user within the throttle window", () => {
    const userId = `throttle-test-${Date.now()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(checkAuthenticatedTrackViewThrottle(userId)).toBe(true);
    }
    expect(checkAuthenticatedTrackViewThrottle(userId)).toBe(false);
  });
});
