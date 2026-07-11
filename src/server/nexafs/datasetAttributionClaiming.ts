import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/prisma/client";
import {
  contributorFlagsForClaimStatus,
  effectiveAttributionDisplayPreferences,
  type ExperimentContributorClaimStatus,
  parseAttributionDisplayPreferences,
  parseAutoAcceptMode,
  type UserAttributionPreferences,
  type UserAttributionPreferencesView,
  userHasAdminOrMaintainerLineageRole,
} from "~/lib/dataset-attribution-claim";
import type { ExperimentAttributionInput } from "~/server/nexafs/experimentAttributions";
import { getUserSessionCapabilities } from "~/server/auth/privileged-role";
import { scheduleZenodoDepositSync } from "~/server/zenodo";

export type ContributorUserContext = {
  id: string;
  autoAcceptMode: UserAttributionPreferences["autoAcceptMode"];
  displayPreferences: UserAttributionPreferences["displayPreferences"];
  roleSlugs: string[];
};

/**
 * Batch-loads sorted role slugs for many users in one `userAppRole` query.
 *
 * @param db - Prisma client or transaction client.
 * @param userIds - `next_auth.user.id` values (ORCID primary keys).
 * @returns Map from user id to sorted role slug list; users with no roles map to `[]`.
 */
async function loadRoleSlugsByUserId(
  db: PrismaClient | Prisma.TransactionClient,
  userIds: readonly string[],
): Promise<Map<string, string[]>> {
  const roleSlugsByUserId = new Map<string, string[]>();
  for (const userId of userIds) {
    roleSlugsByUserId.set(userId, []);
  }
  if (userIds.length === 0) {
    return roleSlugsByUserId;
  }
  const links = await db.userAppRole.findMany({
    where: { userId: { in: [...userIds] } },
    select: {
      userId: true,
      role: { select: { slug: true } },
    },
  });
  for (const link of links) {
    const slugs = roleSlugsByUserId.get(link.userId);
    if (slugs) {
      slugs.push(link.role.slug);
    } else {
      roleSlugsByUserId.set(link.userId, [link.role.slug]);
    }
  }
  for (const slugs of roleSlugsByUserId.values()) {
    slugs.sort();
  }
  return roleSlugsByUserId;
}

/**
 * Loads Atlas users referenced by attribution ORCIDs together with attribution preferences.
 */
export async function loadContributorUserContextByOrcid(
  db: PrismaClient | Prisma.TransactionClient,
  orcids: readonly string[],
): Promise<Map<string, ContributorUserContext>> {
  const unique = [
    ...new Set(orcids.map((orcid) => orcid.trim()).filter(Boolean)),
  ];
  if (unique.length === 0) {
    return new Map();
  }
  const users = await db.user.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      autoAcceptMode: true,
      attributionDisplayPreferences: true,
    },
  });
  const roleSlugsByUserId = await loadRoleSlugsByUserId(
    db,
    users.map((user) => user.id),
  );
  const out = new Map<string, ContributorUserContext>();
  for (const user of users) {
    const roleSlugs = roleSlugsByUserId.get(user.id) ?? [];
    const displayPreferences = effectiveAttributionDisplayPreferences(
      parseAttributionDisplayPreferences(user.attributionDisplayPreferences),
      roleSlugs,
    );
    out.set(user.id, {
      id: user.id,
      autoAcceptMode: parseAutoAcceptMode(user.autoAcceptMode),
      displayPreferences,
      roleSlugs,
    });
  }
  return out;
}

/**
 * Resolves initial claim status when persisting experiment contributor rows.
 */
export function resolveInitialContributorClaimStatus(params: {
  orcid: string;
  sessionOrcid: string | null | undefined;
  userContext: ContributorUserContext | undefined;
}): ExperimentContributorClaimStatus {
  if (params.sessionOrcid && params.orcid === params.sessionOrcid) {
    return "accepted";
  }
  if (params.userContext?.autoAcceptMode === "all") {
    return "accepted";
  }
  return "pending";
}

/**
 * Builds insert rows for experiment contributors including claim lifecycle fields.
 */
export function buildContributorRowsWithClaimStatus(
  rows: ExperimentAttributionInput[],
  userContextByOrcid: ReadonlyMap<string, ContributorUserContext>,
  sessionOrcid: string | null | undefined,
): Array<{
  orcidid: string;
  userid: string | null;
  role: ExperimentAttributionInput["role"];
  claimstatus: ExperimentContributorClaimStatus;
  isclaimed: boolean;
  ispublicprofilevisible: boolean;
  claimedat: Date | null;
  detachedat: Date | null;
}> {
  return rows.map((row) => {
    const userContext = userContextByOrcid.get(row.orcid);
    const claimStatus = resolveInitialContributorClaimStatus({
      orcid: row.orcid,
      sessionOrcid,
      userContext,
    });
    const userId = userContext?.id ?? null;
    const flags = contributorFlagsForClaimStatus(claimStatus, userId);
    return {
      orcidid: row.orcid,
      userid: flags.userid,
      role: row.role,
      claimstatus: claimStatus,
      isclaimed: flags.isclaimed,
      ispublicprofilevisible: flags.ispublicprofilevisible,
      claimedat: flags.claimedat,
      detachedat: flags.detachedat,
    };
  });
}

/**
 * Applies accept, decline, or unclaim to one contributor row owned by the session ORCID.
 *
 * On success, schedules a Zenodo metadata sync so published deposits pick up the
 * claimed display name (or revert to ORCID labeling on unclaim/decline).
 */
export async function updateContributorClaimForSessionUser(
  db: PrismaClient,
  params: {
    contributorId: string;
    sessionOrcid: string;
    nextStatus: ExperimentContributorClaimStatus;
  },
): Promise<{ updated: boolean; experimentId: string }> {
  const row = await db.experimentcontributors.findUnique({
    where: { id: params.contributorId },
    select: { id: true, orcidid: true, userid: true, experimentid: true },
  });
  if (row?.orcidid !== params.sessionOrcid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only update your own dataset attributions",
    });
  }
  const userId = row?.userid ?? params.sessionOrcid;
  const flags = contributorFlagsForClaimStatus(params.nextStatus, userId);
  await db.experimentcontributors.update({
    where: { id: params.contributorId },
    data: {
      claimstatus: params.nextStatus,
      isclaimed: flags.isclaimed,
      ispublicprofilevisible: flags.ispublicprofilevisible,
      userid: flags.userid,
      detachedat: flags.detachedat,
      claimedat: flags.claimedat,
    },
  });
  scheduleZenodoDepositSync(db, row.experimentid, { mode: "metadata" });
  return { updated: true, experimentId: row.experimentid };
}

export type PendingAttributionListItem = {
  contributorId: string;
  experimentId: string;
  role: string;
  claimStatus: ExperimentContributorClaimStatus;
  createdAt: Date;
  experiment: {
    id: string;
    createdAt: Date;
    moleculeName: string | null;
    edgeLabel: string;
    instrumentName: string;
    facilityName: string | null;
  };
};

/**
 * Lists pending dataset attributions for the signed-in user's ORCID.
 */
export async function listPendingAttributionsForOrcid(
  db: PrismaClient,
  orcid: string,
): Promise<PendingAttributionListItem[]> {
  const rows = await db.experimentcontributors.findMany({
    where: {
      orcidid: orcid,
      claimstatus: "pending",
    },
    orderBy: [{ createdat: "desc" }],
    include: {
      experiments: {
        select: {
          id: true,
          createdat: true,
          samples: {
            select: {
              molecules: {
                select: {
                  iupacname: true,
                  chemicalformula: true,
                },
              },
            },
          },
          edges: { select: { targetatom: true, corestate: true } },
          instruments: {
            select: {
              name: true,
              facilities: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return rows.map((row) => ({
    contributorId: row.id,
    experimentId: row.experimentid,
    role: row.role,
    claimStatus: row.claimstatus,
    createdAt: row.createdat,
    experiment: {
      id: row.experiments.id,
      createdAt: row.experiments.createdat,
      moleculeName:
        row.experiments.samples.molecules.iupacname ??
        row.experiments.samples.molecules.chemicalformula,
      edgeLabel: `${row.experiments.edges.targetatom} ${row.experiments.edges.corestate}`,
      instrumentName: row.experiments.instruments.name,
      facilityName: row.experiments.instruments.facilities?.name ?? null,
    },
  }));
}

/**
 * Counts pending dataset attributions for nav badge surfaces.
 */
export async function countPendingAttributionsForOrcid(
  db: PrismaClient,
  orcid: string,
): Promise<number> {
  return db.experimentcontributors.count({
    where: {
      orcidid: orcid,
      claimstatus: "pending",
    },
  });
}

/**
 * Reads attribution preference fields for the session user.
 */
export async function getAttributionPreferencesForUser(
  db: PrismaClient,
  userId: string,
): Promise<UserAttributionPreferencesView> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      autoAcceptMode: true,
      attributionDisplayPreferences: true,
    },
  });
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }
  const caps = await getUserSessionCapabilities(db, userId);
  const pendingDisplayManagedByRole = userHasAdminOrMaintainerLineageRole(
    caps.roleSlugs,
  );
  const displayPreferences = effectiveAttributionDisplayPreferences(
    parseAttributionDisplayPreferences(user.attributionDisplayPreferences),
    caps.roleSlugs,
  );
  return {
    autoAcceptMode: parseAutoAcceptMode(user.autoAcceptMode),
    displayPreferences,
    pendingDisplayManagedByRole,
    profilePreview: {
      orcid: user.id,
      name: user.name,
      image: user.image,
    },
  };
}

/**
 * Persists attribution preference fields for the session user.
 */
export async function setAttributionPreferencesForUser(
  db: PrismaClient,
  userId: string,
  prefs: UserAttributionPreferences,
): Promise<UserAttributionPreferencesView> {
  const caps = await getUserSessionCapabilities(db, userId);
  const pendingDisplayManagedByRole = userHasAdminOrMaintainerLineageRole(
    caps.roleSlugs,
  );
  const displayPreferencesToStore = pendingDisplayManagedByRole
    ? {
        ...prefs.displayPreferences,
        pending: "name_and_avatar" as const,
      }
    : prefs.displayPreferences;
  const updated = await db.user.update({
    where: { id: userId },
    data: {
      autoAcceptMode: prefs.autoAcceptMode,
      attributionDisplayPreferences: displayPreferencesToStore,
    },
    select: {
      id: true,
      name: true,
      image: true,
      autoAcceptMode: true,
      attributionDisplayPreferences: true,
    },
  });
  const displayPreferences = effectiveAttributionDisplayPreferences(
    parseAttributionDisplayPreferences(updated.attributionDisplayPreferences),
    caps.roleSlugs,
  );

  const contributedExperiments = await db.experimentcontributors.findMany({
    where: { orcidid: userId },
    select: { experimentid: true },
    distinct: ["experimentid"],
  });
  for (const row of contributedExperiments) {
    scheduleZenodoDepositSync(db, row.experimentid, { mode: "metadata" });
  }

  return {
    autoAcceptMode: parseAutoAcceptMode(updated.autoAcceptMode),
    displayPreferences,
    pendingDisplayManagedByRole,
    profilePreview: {
      orcid: updated.id,
      name: updated.name,
      image: updated.image,
    },
  };
}
