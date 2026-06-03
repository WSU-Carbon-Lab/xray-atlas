import { TRPCError } from "@trpc/server";
import type { Prisma, PrismaClient } from "~/prisma/client";
import {
  coerceContributorRoleInput,
  dataCiteContributorTypeSchema,
  isCollectorContributorRole,
  isUploaderContributorRole,
  normalizeStoredContributorRole,
  type DataCiteContributorType,
} from "~/lib/datacite-contributor-types";
import { userHasCurrentContributionAgreement } from "~/lib/nexafs-attribution";
import {
  resolveAttributionPublicDisplay,
  type ExperimentContributorClaimStatus,
} from "~/lib/dataset-attribution-claim";
import {
  isValidOrcidUserId,
  orcidUserIdSchema,
  parseOrcidForStorage,
} from "~/lib/orcid";
import {
  buildContributorRowsWithClaimStatus,
  loadContributorUserContextByOrcid,
} from "~/server/nexafs/datasetAttributionClaiming";
import { getUserSessionCapabilities } from "~/server/auth/privileged-role";

export type ExperimentAttributionInput = {
  orcid: string;
  role: DataCiteContributorType;
};

export type ExperimentContributorInsertRow = {
  orcidid: string;
  userid: string | null;
  role: DataCiteContributorType;
  claimstatus: ExperimentContributorClaimStatus;
  isclaimed: boolean;
  ispublicprofilevisible: boolean;
  claimedat: Date | null;
  detachedat: Date | null;
};

const attributionInputSchema = orcidUserIdSchema;

/**
 * Parses and deduplicates attribution payloads from create or update mutations.
 */
export function normalizeAttributionInputs(
  rows: Array<{ orcid: string; role: string }>,
): ExperimentAttributionInput[] {
  const deduped = new Map<string, ExperimentAttributionInput>();
  for (const row of rows) {
    if (!isValidOrcidUserId(row.orcid)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid ORCID iD for attribution: ${row.orcid}`,
      });
    }
    const orcid = parseOrcidForStorage(row.orcid);
    attributionInputSchema.parse(orcid);
    const role = coerceContributorRoleInput(row.role);
    if (!role) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unsupported attribution role: ${row.role}`,
      });
    }
    dataCiteContributorTypeSchema.parse(role);
    deduped.set(`${orcid}:${role}`, { orcid, role });
  }
  return [...deduped.values()];
}

/**
 * Ensures the uploading user appears as DataCurator when they are authenticated.
 */
export function ensureUploaderOwnerAttribution(
  rows: ExperimentAttributionInput[],
  uploaderOrcid: string | null,
): ExperimentAttributionInput[] {
  if (!uploaderOrcid) {
    return rows;
  }
  const normalizedUploader = parseOrcidForStorage(uploaderOrcid);
  const hasUploader = rows.some(
    (row) =>
      row.role === "DataCurator" && row.orcid === normalizedUploader,
  );
  if (hasUploader) {
    return rows;
  }
  return [{ orcid: normalizedUploader, role: "DataCurator" }, ...rows];
}

/**
 * Validates create-time attribution: exactly one DataCurator row overall.
 */
export function assertValidCreateAttributions(
  rows: ExperimentAttributionInput[],
): void {
  const uploaders = rows.filter((row) => row.role === "DataCurator");
  if (uploaders.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "At least one data curator (uploader) attribution is required",
    });
  }
  if (uploaders.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only one data curator (uploader) is allowed per dataset",
    });
  }
}

/**
 * Resolves linked Atlas users for attribution ORCIDs and builds rows for `experiment_contributors`.
 */
export async function buildContributorInsertRows(
  db: PrismaClient | Prisma.TransactionClient,
  rows: ExperimentAttributionInput[],
  sessionOrcid: string | null = null,
): Promise<ExperimentContributorInsertRow[]> {
  const orcids = [...new Set(rows.map((row) => row.orcid))];
  const userContextByOrcid = await loadContributorUserContextByOrcid(db, orcids);
  return buildContributorRowsWithClaimStatus(
    rows,
    userContextByOrcid,
    sessionOrcid,
  );
}

/**
 * Preserves claim lifecycle fields when an experiment attribution list is rewritten.
 */
export function mergeContributorRowsWithExistingClaimState(
  nextRows: ExperimentContributorInsertRow[],
  existingRows: Array<{
    orcidid: string;
    role: string;
    userid: string | null;
    claimstatus: ExperimentContributorClaimStatus;
    isclaimed: boolean;
    ispublicprofilevisible: boolean;
    claimedat: Date | null;
    detachedat: Date | null;
  }>,
): ExperimentContributorInsertRow[] {
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.orcidid}:${row.role}`, row]),
  );
  return nextRows.map((row) => {
    const existing = existingByKey.get(`${row.orcidid}:${row.role}`);
    if (!existing) {
      return row;
    }
    return {
      ...row,
      userid: existing.userid ?? row.userid,
      claimstatus: existing.claimstatus,
      isclaimed: existing.isclaimed,
      ispublicprofilevisible: existing.ispublicprofilevisible,
      claimedat: existing.claimedat,
      detachedat: existing.detachedat,
    };
  });
}

/**
 * Maps stored contributor rows to API DTOs for edit surfaces.
 */
export async function mapContributorRowsToDto(
  db: PrismaClient | Prisma.TransactionClient,
  rows: Array<{
    id: string;
    orcidid: string;
    userid: string | null;
    role: string;
    isclaimed: boolean;
    ispublicprofilevisible: boolean;
    claimstatus: ExperimentContributorClaimStatus;
    user: {
      name: string | null;
      image: string | null;
      contributionAgreementAccepted: boolean;
      contributionAgreementVersion: string | null;
      showNameOnPendingAttributions: boolean;
      autoAcceptAttributions: boolean;
    } | null;
  }>,
) {
  const roleSlugsByOrcid = new Map<string, string[]>();
  for (const row of rows) {
    if (!roleSlugsByOrcid.has(row.orcidid)) {
      const caps = await getUserSessionCapabilities(db as PrismaClient, row.orcidid);
      roleSlugsByOrcid.set(row.orcidid, caps.roleSlugs);
    }
  }

  return rows
    .map((row) => {
      const role = normalizeStoredContributorRole(row.role);
      if (!role) return null;
      const resolved = resolveAttributionPublicDisplay({
        orcid: row.orcidid,
        claimStatus: row.claimstatus,
        storedDisplayName: row.user?.name ?? null,
        storedImageUrl: row.user?.image ?? null,
        targetPreferences: {
          showNameOnPendingAttributions:
            row.user?.showNameOnPendingAttributions ?? false,
          autoAcceptAttributions: row.user?.autoAcceptAttributions ?? false,
        },
        targetRoleSlugs: roleSlugsByOrcid.get(row.orcidid) ?? [],
      });
      const isClaimed = row.claimstatus === "accepted";
      return {
        id: row.id,
        orcid: row.orcidid,
        role,
        userId: row.userid,
        displayName: resolved.displayName,
        image: resolved.showProfileImage ? resolved.imageUrl : null,
        isClaimed,
        isPublicProfileVisible: isClaimed && row.ispublicprofilevisible,
        claimStatus: row.claimstatus,
        hasContributionAgreement: row.user
          ? userHasCurrentContributionAgreement(row.user)
          : false,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

/**
 * Lists collector ORCIDs from attribution rows (registered or unclaimed).
 */
export function collectorUserIdsFromAttributions(
  rows: ExperimentAttributionInput[],
): string[] {
  return [
    ...new Set(
      rows
        .filter((row) => row.role === "DataCollector")
        .map((row) => row.orcid),
    ),
  ];
}

/**
 * Returns collector ORCIDs that match existing Atlas user accounts for `collected_by_user_ids`.
 */
export async function resolveKnownCollectorUserIds(
  db: PrismaClient | Prisma.TransactionClient,
  rows: ExperimentAttributionInput[],
): Promise<string[]> {
  const collectorOrcids = collectorUserIdsFromAttributions(rows);
  if (collectorOrcids.length === 0) {
    return [];
  }
  const users = await db.user.findMany({
    where: { id: { in: collectorOrcids } },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export { isCollectorContributorRole, isUploaderContributorRole };
