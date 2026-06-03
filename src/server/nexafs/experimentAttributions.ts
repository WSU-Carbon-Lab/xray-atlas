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
  isValidOrcidUserId,
  orcidUserIdSchema,
  parseOrcidForStorage,
} from "~/lib/orcid";

export type ExperimentAttributionInput = {
  orcid: string;
  role: DataCiteContributorType;
};

export type ExperimentContributorInsertRow = {
  orcidid: string;
  userid: string | null;
  role: DataCiteContributorType;
  isclaimed: boolean;
  ispublicprofilevisible: boolean;
  claimedat: Date | null;
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
): Promise<ExperimentContributorInsertRow[]> {
  const orcids = [...new Set(rows.map((row) => row.orcid))];
  const users =
    orcids.length > 0
      ? await db.user.findMany({
          where: { id: { in: orcids } },
          select: { id: true },
        })
      : [];
  const knownUserIds = new Set(users.map((user) => user.id));
  const now = new Date();

  return rows.map((row) => {
    const isKnownUser = knownUserIds.has(row.orcid);
    return {
      orcidid: row.orcid,
      userid: isKnownUser ? row.orcid : null,
      role: row.role,
      isclaimed: isKnownUser,
      ispublicprofilevisible: isKnownUser,
      claimedat: isKnownUser ? now : null,
    };
  });
}

/**
 * Maps stored contributor rows to API DTOs for edit surfaces.
 */
export function mapContributorRowsToDto(
  rows: Array<{
    id: string;
    orcidid: string;
    userid: string | null;
    role: string;
    isclaimed: boolean;
    ispublicprofilevisible: boolean;
    user: {
      name: string | null;
      image: string | null;
      contributionAgreementAccepted: boolean;
      contributionAgreementVersion: string | null;
    } | null;
  }>,
) {
  return rows
    .map((row) => {
      const role = normalizeStoredContributorRole(row.role);
      if (!role) return null;
      return {
        id: row.id,
        orcid: row.orcidid,
        role,
        userId: row.userid,
        displayName: row.user?.name ?? null,
        image: row.user?.image ?? null,
        isClaimed: row.isclaimed,
        isPublicProfileVisible: row.ispublicprofilevisible,
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
