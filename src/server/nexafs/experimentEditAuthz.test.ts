import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { PrismaClient } from "~/prisma/client";
import {
  userMayEditExperiment,
  userMayEditSample,
} from "./experimentEditAuthz";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const OWNER_ORCID = "0000-0001-2345-6789";
const COLLECTOR_ORCID = "0000-0002-2345-6789";
const STRANGER_ORCID = "0000-0003-2345-6789";
const EXPERIMENT_ID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_ID = "22222222-2222-4222-8222-222222222222";

type ContributorRow = {
  orcidid: string;
  role: string;
  detachedat: Date | null;
  isclaimed: boolean;
  userid: string | null;
};

function createAuthzMockDb(config: {
  experiment?: { createdby: string | null } | null;
  contributors?: ContributorRow[];
  sampleExperimentIds?: string[];
  privilegedUserIds?: Set<string>;
}): PrismaClient {
  const privilegedUserIds = config.privilegedUserIds ?? new Set<string>();

  return {
    experiments: {
      findUnique: async () => config.experiment ?? null,
      findMany: async () =>
        (config.sampleExperimentIds ?? []).map((id) => ({ id })),
    },
    experimentcontributors: {
      findMany: async () => config.contributors ?? [],
    },
    userAppRole: {
      findMany: async ({
        where,
      }: {
        where?: { userId?: string };
      }) => {
        const userId = where?.userId;
        if (userId && privilegedUserIds.has(userId)) {
          return [
            {
              role: {
                permissions: ["labs_access"],
              },
            },
          ];
        }
        return [];
      },
    },
  } as unknown as PrismaClient;
}

describe("userMayEditExperiment", () => {
  it("allows privileged users", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: STRANGER_ORCID },
      contributors: [],
      privilegedUserIds: new Set([OWNER_ORCID]),
    });
    const allowed = await userMayEditExperiment(db, OWNER_ORCID, EXPERIMENT_ID);
    expect(allowed).toBe(true);
  });

  it("allows claimed owner contributor", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: STRANGER_ORCID },
      contributors: [
        {
          orcidid: OWNER_ORCID,
          role: "owner",
          detachedat: null,
          isclaimed: true,
          userid: OWNER_ORCID,
        },
      ],
    });
    const allowed = await userMayEditExperiment(db, OWNER_ORCID, EXPERIMENT_ID);
    expect(allowed).toBe(true);
  });

  it("allows claimed collector contributor", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: STRANGER_ORCID },
      contributors: [
        {
          orcidid: COLLECTOR_ORCID,
          role: "collector",
          detachedat: null,
          isclaimed: true,
          userid: COLLECTOR_ORCID,
        },
      ],
    });
    const allowed = await userMayEditExperiment(
      db,
      COLLECTOR_ORCID,
      EXPERIMENT_ID,
    );
    expect(allowed).toBe(true);
  });

  it("denies detached contributor", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: STRANGER_ORCID },
      contributors: [
        {
          orcidid: COLLECTOR_ORCID,
          role: "collector",
          detachedat: new Date(),
          isclaimed: true,
          userid: COLLECTOR_ORCID,
        },
      ],
    });
    const allowed = await userMayEditExperiment(
      db,
      COLLECTOR_ORCID,
      EXPERIMENT_ID,
    );
    expect(allowed).toBe(false);
  });

  it("denies unclaimed contributor", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: STRANGER_ORCID },
      contributors: [
        {
          orcidid: COLLECTOR_ORCID,
          role: "collector",
          detachedat: null,
          isclaimed: false,
          userid: null,
        },
      ],
    });
    const allowed = await userMayEditExperiment(
      db,
      COLLECTOR_ORCID,
      EXPERIMENT_ID,
    );
    expect(allowed).toBe(false);
  });

  it("denies stranger without contributor row", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: OWNER_ORCID },
      contributors: [
        {
          orcidid: OWNER_ORCID,
          role: "owner",
          detachedat: null,
          isclaimed: true,
          userid: OWNER_ORCID,
        },
      ],
    });
    const allowed = await userMayEditExperiment(
      db,
      STRANGER_ORCID,
      EXPERIMENT_ID,
    );
    expect(allowed).toBe(false);
  });

  it("allows createdby when no owner contributor row exists", async () => {
    const db = createAuthzMockDb({
      experiment: { createdby: OWNER_ORCID },
      contributors: [
        {
          orcidid: COLLECTOR_ORCID,
          role: "collector",
          detachedat: null,
          isclaimed: true,
          userid: COLLECTOR_ORCID,
        },
      ],
    });
    const allowed = await userMayEditExperiment(db, OWNER_ORCID, EXPERIMENT_ID);
    expect(allowed).toBe(true);
  });
});

describe("userMayEditSample", () => {
  it("allows when any linked experiment is editable", async () => {
    const db = createAuthzMockDb({
      sampleExperimentIds: [EXPERIMENT_ID],
      experiment: { createdby: OWNER_ORCID },
      contributors: [],
    });
    const allowed = await userMayEditSample(db, OWNER_ORCID, SAMPLE_ID);
    expect(allowed).toBe(true);
  });
});
