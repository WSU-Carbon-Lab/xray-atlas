import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  ATTRIBUTION_TEAM_GROUP_TYPES,
  buildAttributionTeamRosterFromSlots,
  type AttributionTeamGroupType,
} from "~/lib/attribution-team-roster-sync";
import { dataCiteContributorTypeSchema } from "~/lib/datacite-contributor-types";
import { userHasCurrentContributionAgreement } from "~/lib/nexafs-attribution";
import { orcidUserIdSchema } from "~/lib/orcid";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import type { Prisma, PrismaClient } from "~/prisma/client";

const attributionTeamGroupTypeSchema = z.enum(ATTRIBUTION_TEAM_GROUP_TYPES);

const teamMemberInputSchema = z.object({
  orcid: orcidUserIdSchema,
  contributorType: dataCiteContributorTypeSchema,
  displayName: z.string().trim().min(1).max(256).nullable(),
});

const teamMetadataInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  institution: z.string().trim().max(256).nullable().optional(),
  researchGroupName: z.string().trim().max(256).nullable().optional(),
  groupType: attributionTeamGroupTypeSchema.default("beamtime"),
  piOrcid: orcidUserIdSchema.nullable().optional(),
  experimentLeadOrcid: orcidUserIdSchema.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  members: z.array(teamMemberInputSchema).max(50).default([]),
});

const teamIdSchema = z.object({
  teamId: z.string().uuid(),
});

export type AttributionTeamMemberDto = {
  id: string;
  orcid: string;
  contributorType: z.infer<typeof dataCiteContributorTypeSchema>;
  displayName: string | null;
  userId: string | null;
  isClaimed: boolean;
  hasContributionAgreement: boolean;
  imageUrl: string | null;
};

/** Summary row for a team the session user owns or appears on as a roster member. */
export type AttributionTeamSummaryDto = {
  id: string;
  name: string;
  institution: string | null;
  researchGroupName: string | null;
  groupType: AttributionTeamGroupType;
  piOrcid: string | null;
  experimentLeadOrcid: string | null;
  description: string | null;
  memberCount: number;
  updatedAt: Date;
  /** True when the session user created the team and may edit or delete it. */
  isOwner: boolean;
};

export type AttributionTeamDetailDto = AttributionTeamSummaryDto & {
  members: AttributionTeamMemberDto[];
};

function mapMemberRow(row: {
  id: string;
  orcidid: string;
  userid: string | null;
  displayname: string | null;
  contributortype: string;
  user: {
    name: string | null;
    image: string | null;
    contributionAgreementAccepted: boolean;
    contributionAgreementVersion: string | null;
  } | null;
}): AttributionTeamMemberDto {
  const contributorType = dataCiteContributorTypeSchema.parse(
    row.contributortype,
  );
  const isClaimed = Boolean(row.userid);
  return {
    id: row.id,
    orcid: row.orcidid,
    contributorType,
    displayName: row.displayname ?? row.user?.name ?? null,
    userId: row.userid,
    isClaimed,
    hasContributionAgreement: row.user
      ? userHasCurrentContributionAgreement(row.user)
      : false,
    imageUrl: row.user?.image?.trim() ?? null,
  };
}

function mapTeamSummaryRow(
  team: {
    id: string;
    name: string;
    institution: string | null;
    researchgroupname: string | null;
    grouptype: string;
    piorcidid: string | null;
    experimentleadorcidid: string | null;
    description: string | null;
    updatedat: Date;
    ownerid: string;
    _count: { members: number };
  },
  sessionUserId: string,
): AttributionTeamSummaryDto {
  const groupType = attributionTeamGroupTypeSchema.parse(team.grouptype);
  return {
    id: team.id,
    name: team.name,
    institution: team.institution,
    researchGroupName: team.researchgroupname,
    groupType,
    piOrcid: team.piorcidid,
    experimentLeadOrcid: team.experimentleadorcidid,
    description: team.description,
    memberCount: team._count.members,
    updatedAt: team.updatedat,
    isOwner: team.ownerid === sessionUserId,
  };
}

/** Prisma filter for teams the session user owns or is rostered on. */
function teamsForSessionUserWhere(userId: string): Prisma.attributionteamWhereInput {
  return {
    OR: [
      { ownerid: userId },
      {
        members: {
          some: {
            OR: [{ orcidid: userId }, { userid: userId }],
          },
        },
      },
    ],
  };
}

async function resolveMemberPersistFields(
  db: PrismaClient | Prisma.TransactionClient,
  member: z.infer<typeof teamMemberInputSchema>,
) {
  const orcid = member.orcid.trim();
  const atlasUser = await db.user.findUnique({
    where: { id: orcid },
    select: {
      id: true,
      name: true,
      image: true,
      contributionAgreementAccepted: true,
      contributionAgreementVersion: true,
    },
  });

  return {
    orcidid: orcid,
    userid: atlasUser?.id ?? null,
    displayname:
      member.displayName?.trim() ??
      atlasUser?.name?.trim() ??
      null,
    contributortype: member.contributorType,
  };
}

async function assertTeamOwner(
  db: PrismaClient,
  teamId: string,
  userId: string,
) {
  const access = await assertTeamMemberOrOwner(db, teamId, userId);
  if (!access.isOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your team" });
  }
  return access;
}

/**
 * Ensures the session user may read a team because they own it or appear on its roster.
 * Mutations remain owner-only via {@link assertTeamOwner}.
 */
async function assertTeamMemberOrOwner(
  db: PrismaClient,
  teamId: string,
  userId: string,
): Promise<{ isOwner: boolean }> {
  const team = await db.attributionteam.findUnique({
    where: { id: teamId },
    select: {
      ownerid: true,
      members: {
        where: {
          OR: [{ orcidid: userId }, { userid: userId }],
        },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }
  const isOwner = team.ownerid === userId;
  const isRosterMember = team.members.length > 0;
  if (!isOwner && !isRosterMember) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not on this team" });
  }
  return { isOwner };
}

function dedupeMemberInputs(
  members: z.infer<typeof teamMemberInputSchema>[],
): z.infer<typeof teamMemberInputSchema>[] {
  const byKey = new Map<string, z.infer<typeof teamMemberInputSchema>>();
  for (const member of members) {
    const key = `${member.orcid.trim()}:${member.contributorType}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, member);
      continue;
    }
    byKey.set(key, {
      ...existing,
      displayName: existing.displayName ?? member.displayName,
    });
  }
  return [...byKey.values()];
}

function normalizeNullableOrcid(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return orcidUserIdSchema.parse(trimmed);
}

function teamMetadataToPersist(input: z.infer<typeof teamMetadataInputSchema>) {
  return {
    name: input.name.trim(),
    institution: input.institution?.trim() ?? null,
    researchgroupname: input.researchGroupName?.trim() ?? null,
    grouptype: input.groupType,
    piorcidid: normalizeNullableOrcid(input.piOrcid),
    experimentleadorcidid: normalizeNullableOrcid(input.experimentLeadOrcid),
    description: input.description?.trim() ?? null,
  };
}

async function persistTeamMembers(
  db: PrismaClient | Prisma.TransactionClient,
  teamId: string,
  input: z.infer<typeof teamMetadataInputSchema>,
) {
  const roster = buildAttributionTeamRosterFromSlots({
    members: dedupeMemberInputs(input.members),
    piOrcid: normalizeNullableOrcid(input.piOrcid),
    experimentLeadOrcid: normalizeNullableOrcid(input.experimentLeadOrcid),
  });
  const memberRows = await Promise.all(
    roster.map((member) => resolveMemberPersistFields(db, member)),
  );

  await db.attributionteammember.deleteMany({ where: { teamid: teamId } });
  if (memberRows.length > 0) {
    await db.attributionteammember.createMany({
      data: memberRows.map((row) => ({
        teamid: teamId,
        ...row,
      })),
    });
  }
}

export const attributionTeamsRouter = createTRPCRouter({
  /** Lists teams the session user owns or is rostered on; not a global catalog. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const teams = await ctx.db.attributionteam.findMany({
      where: teamsForSessionUserWhere(ctx.userId),
      orderBy: [{ updatedat: "desc" }, { name: "asc" }],
      include: { _count: { select: { members: true } } },
    });

    return teams.map((team) => mapTeamSummaryRow(team, ctx.userId));
  }),

  getById: protectedProcedure
    .input(teamIdSchema)
    .query(async ({ ctx, input }) => {
      await assertTeamMemberOrOwner(ctx.db, input.teamId, ctx.userId);
      const team = await ctx.db.attributionteam.findUniqueOrThrow({
        where: { id: input.teamId },
        include: {
          members: {
            orderBy: [{ contributortype: "asc" }, { orcidid: "asc" }],
            include: {
              user: {
                select: {
                  name: true,
                  image: true,
                  contributionAgreementAccepted: true,
                  contributionAgreementVersion: true,
                },
              },
            },
          },
          _count: { select: { members: true } },
        },
      });

      return {
        ...mapTeamSummaryRow(team, ctx.userId),
        members: team.members.map(mapMemberRow),
      } satisfies AttributionTeamDetailDto;
    }),

  create: protectedProcedure
    .input(teamMetadataInputSchema)
    .mutation(async ({ ctx, input }) => {
      const metadata = teamMetadataToPersist(input);

      const team = await ctx.db.$transaction(async (tx) => {
        const created = await tx.attributionteam.create({
          data: {
            ...metadata,
            ownerid: ctx.userId,
          },
        });
        await persistTeamMembers(tx, created.id, input);
        return created;
      });

      return { id: team.id };
    }),

  update: protectedProcedure
    .input(
      teamMetadataInputSchema.extend({
        teamId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTeamOwner(ctx.db, input.teamId, ctx.userId);
      const metadata = teamMetadataToPersist(input);

      await ctx.db.$transaction(async (tx) => {
        await tx.attributionteam.update({
          where: { id: input.teamId },
          data: metadata,
        });
        await persistTeamMembers(tx, input.teamId, input);
      });

      return { id: input.teamId };
    }),

  delete: protectedProcedure
    .input(teamIdSchema)
    .mutation(async ({ ctx, input }) => {
      await assertTeamOwner(ctx.db, input.teamId, ctx.userId);
      await ctx.db.attributionteam.delete({ where: { id: input.teamId } });
      return { deleted: true as const };
    }),
});
