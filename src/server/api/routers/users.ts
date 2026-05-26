import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  privilegedWriteProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { evaluateSessionWriteAssurance } from "~/server/auth/mfa-access";
import { isAal3Eligible } from "~/server/auth/aal";
import {
  getPasskeyEnrollmentStatus,
  requiresAal3ForUser,
} from "~/server/auth/passkey-policy";
import {
  auditRequestMetaFromTrpcContext,
  emitAuditEvent,
} from "~/server/audit";
import {
  CONTRIBUTION_AGREEMENT_VERSION,
} from "~/lib/contribution-agreement";
import { orcidUserIdSchema } from "~/lib/orcid";
import { resolveUserIdFromRouteSegment } from "~/lib/user-route";
import { toMoleculeView } from "~/server/api/routers/molecules-view";
import { fetchNexafsBrowseGrouped } from "~/server/nexafs/nexafsBrowseGroups";
import { decryptOAuthToken } from "~/server/auth/oauth-token-crypto";

const contributionAgreementStatusSchema = z.object({
  accepted: z.boolean(),
  acceptedAt: z.date().nullable(),
  agreementVersion: z.string().nullable(),
  currentVersion: z.string(),
  needsAcceptance: z.boolean(),
});

const userProfileRoleSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  color: z.string(),
});

const userPublicGitHubSchema = z.object({
  login: z.string().nullable(),
  profileUrl: z.string().url().nullable(),
});

const userPublicProfileSchema = z.object({
  id: orcidUserIdSchema,
  name: z.string().nullable(),
  image: z.string().nullable(),
  roles: z.array(userProfileRoleSchema),
  github: userPublicGitHubSchema.nullable(),
});

const userRouteIdSchema = z.string().min(1).max(64);

const profileContributionStatsSchema = z.object({
  moleculesByYear: z.array(
    z.object({
      year: z.number().int(),
      count: z.number().int().nonnegative(),
    }),
  ),
  spectraByYear: z.array(
    z.object({
      year: z.number().int(),
      count: z.number().int().nonnegative(),
    }),
  ),
  totals: z.object({
    molecules: z.number().int().nonnegative(),
    spectra: z.number().int().nonnegative(),
    moleculesThisYear: z.number().int().nonnegative(),
    spectraThisYear: z.number().int().nonnegative(),
  }),
});

type ProfileMoleculeContribution = "creator" | "contributor";

/**
 * Fills missing calendar years between the first and last observed year with zero counts.
 */
function fillContributionYearSeries(
  rows: Array<{ year: number; count: number }>,
): Array<{ year: number; count: number }> {
  if (rows.length === 0) {
    return [];
  }
  const minYear = Math.min(...rows.map((row) => row.year));
  const maxYear = Math.max(...rows.map((row) => row.year));
  const countByYear = new Map(rows.map((row) => [row.year, row.count]));
  const filled: Array<{ year: number; count: number }> = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    filled.push({ year, count: countByYear.get(year) ?? 0 });
  }
  return filled;
}

/**
 * Resolves GitHub login and profile URLs for a linked account using the stored OAuth token.
 */
async function resolveGitHubAccountPresentation(account: {
  access_token: string | null;
}): Promise<{
  login: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
}> {
  if (!account.access_token) {
    return { login: null, profileUrl: null, avatarUrl: null };
  }

  const accessToken = decryptOAuthToken(account.access_token);
  if (!accessToken) {
    return { login: null, profileUrl: null, avatarUrl: null };
  }

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    if (!response.ok) {
      return { login: null, profileUrl: null, avatarUrl: null };
    }
    const body: unknown = await response.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("login" in body) ||
      typeof body.login !== "string"
    ) {
      return { login: null, profileUrl: null, avatarUrl: null };
    }
    const login = body.login;
    const profileUrl =
      "html_url" in body && typeof body.html_url === "string"
        ? body.html_url
        : `https://github.com/${login}`;
    const avatarUrl =
      "avatar_url" in body && typeof body.avatar_url === "string"
        ? body.avatar_url
        : null;
    return { login, profileUrl, avatarUrl };
  } catch {
    return { login: null, profileUrl: null, avatarUrl: null };
  }
}

export const usersRouter = createTRPCRouter({
  getContributionAgreementStatus: protectedProcedure
    .output(contributionAgreementStatusSchema)
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: {
          contributionAgreementAccepted: true,
          contributionAgreementDate: true,
          contributionAgreementVersion: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const needsAcceptance =
        !user.contributionAgreementAccepted ||
        user.contributionAgreementVersion !== CONTRIBUTION_AGREEMENT_VERSION;

      return {
        accepted: user.contributionAgreementAccepted,
        acceptedAt: user.contributionAgreementDate,
        agreementVersion: user.contributionAgreementVersion,
        currentVersion: CONTRIBUTION_AGREEMENT_VERSION,
        needsAcceptance,
      };
    }),

  acceptContributionAgreement: protectedProcedure
    .output(
      z.object({
        success: z.literal(true),
        version: z.string(),
      }),
    )
    .mutation(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const subjectUserId = ctx.userId;
      const requestMeta = auditRequestMetaFromTrpcContext({
        clientIp: ctx.clientIp,
        userAgent: ctx.userAgent,
      });

      const existing = await ctx.db.user.findUnique({
        where: { id: subjectUserId },
        select: {
          name: true,
          contributionAgreementAccepted: true,
          contributionAgreementVersion: true,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (
        existing.contributionAgreementAccepted &&
        existing.contributionAgreementVersion === CONTRIBUTION_AGREEMENT_VERSION
      ) {
        return { success: true as const, version: CONTRIBUTION_AGREEMENT_VERSION };
      }

      await ctx.db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: subjectUserId },
          data: {
            contributionAgreementAccepted: true,
            contributionAgreementDate: new Date(),
            contributionAgreementVersion: CONTRIBUTION_AGREEMENT_VERSION,
          },
        });

        await tx.consentReceipt.create({
          data: {
            userId: subjectUserId,
            agreementVersion: CONTRIBUTION_AGREEMENT_VERSION,
            orcidAtAcceptance: subjectUserId,
            nameAtAcceptance: existing.name,
            sourceIp: ctx.clientIp,
          },
        });

        await emitAuditEvent({
          db: tx,
          eventType: "consent.accept",
          eventScope: "users.acceptContributionAgreement",
          actorUserId: subjectUserId,
          subjectUserId,
          payload: {
            agreementVersion: CONTRIBUTION_AGREEMENT_VERSION,
          },
          requestMeta,
        });
      });

      return { success: true as const, version: CONTRIBUTION_AGREEMENT_VERSION };
    }),

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    return user;
  }),

  getById: publicProcedure
    .input(z.object({ id: userRouteIdSchema }))
    .output(userPublicProfileSchema)
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserIdFromRouteSegment(ctx.db, input.id);
      if (!userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
          userAppRoles: {
            select: {
              role: {
                select: {
                  slug: true,
                  displayName: true,
                  color: true,
                },
              },
            },
            orderBy: { role: { displayName: "asc" } },
          },
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const roles = user.userAppRoles.map((row) => ({
        slug: row.role.slug,
        displayName: row.role.displayName,
        color: row.role.color,
      }));

      const githubAccount = await ctx.db.account.findFirst({
        where: { userId: user.id, provider: "github" },
        select: { access_token: true, providerAccountId: true },
      });

      let github: z.infer<typeof userPublicGitHubSchema> | null = null;
      if (githubAccount) {
        const presentation = await resolveGitHubAccountPresentation({
          access_token: githubAccount.access_token,
        });
        const login =
          presentation.login ??
          `user-${githubAccount.providerAccountId.slice(0, 6)}`;
        github = {
          login: presentation.login,
          profileUrl:
            presentation.profileUrl ??
            (login ? `https://github.com/${login}` : null),
        };
      }

      return {
        id: user.id,
        name: user.name,
        image: user.image,
        roles,
        github,
      };
    }),

  /**
   * Lists molecules where the user created the record or appears in `molecule_contributors`.
   */
  listProfileMolecules: publicProcedure
    .input(
      z.object({
        userId: userRouteIdSchema,
        limit: z.number().min(1).max(24).default(12),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserIdFromRouteSegment(ctx.db, input.userId);
      if (!userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const profileMoleculeWhere = {
        OR: [
          { createdby: userId },
          {
            moleculecontributors: {
              some: { userid: userId },
            },
          },
        ],
      };

      const [molecules, total] = await Promise.all([
        ctx.db.molecules.findMany({
          where: profileMoleculeWhere,
          skip: input.offset,
          take: input.limit,
          include: {
            moleculesynonyms: {
              orderBy: [{ order: "asc" }],
            },
            moleculecontributors: {
              include: {
                user: {
                  select: { id: true, name: true, image: true },
                },
              },
              orderBy: { contributedat: "asc" },
            },
            moleculetags: {
              include: { tags: true },
            },
            samples: {
              include: { _count: { select: { experiments: true } } },
            },
          },
          orderBy: { createdat: "desc" },
        }),
        ctx.db.molecules.count({ where: profileMoleculeWhere }),
      ]);

      const moleculesWithSortedSynonyms = molecules.map((molecule) => ({
        ...molecule,
        moleculesynonyms: [
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order === 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
          ...molecule.moleculesynonyms
            .filter((syn) => syn.order !== 0)
            .sort((a, b) => a.synonym.length - b.synonym.length),
        ],
      }));

      let favoritedSet = new Set<string>();
      if (ctx.userId && moleculesWithSortedSynonyms.length > 0) {
        const ids = moleculesWithSortedSynonyms.map((m) => m.id);
        const favorited = await ctx.db.moleculefavorites.findMany({
          where: {
            moleculeid: { in: ids },
            userid: ctx.userId,
          },
          select: { moleculeid: true },
        });
        favoritedSet = new Set(favorited.map((f) => f.moleculeid));
      }

      const items = moleculesWithSortedSynonyms.map((mol) => {
        const isCreator = mol.createdby === userId;
        const isContributor = mol.moleculecontributors.some(
          (row) => row.userid === userId,
        );
        const contributions: ProfileMoleculeContribution[] = [];
        if (isCreator) contributions.push("creator");
        if (isContributor) contributions.push("contributor");

        return {
          molecule: toMoleculeView(mol, {
            userHasFavorited: favoritedSet.has(mol.id),
          }),
          contributions,
        };
      });

      return {
        items,
        total,
        hasMore: input.offset + items.length < total,
      };
    }),

  /**
   * Lists grouped NEXAFS experiments created by or collected with the given ORCID user.
   */
  listProfileExperiments: publicProcedure
    .input(
      z.object({
        userId: userRouteIdSchema,
        limit: z.number().min(1).max(24).default(12),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserIdFromRouteSegment(ctx.db, input.userId);
      if (!userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { groups, total } = await fetchNexafsBrowseGrouped(ctx.db, {
        viewerUserId: ctx.userId,
        filters: { contributorUserId: userId },
        searchQuery: null,
        sortBy: "newest",
        limit: input.limit,
        offset: input.offset,
      });

      const ownershipRows =
        groups.length === 0
          ? []
          : await ctx.db.experimentcontributors.findMany({
              where: {
                experimentid: { in: groups.map((group) => group.experimentId) },
                orcidid: userId,
              },
              select: {
                experimentid: true,
                role: true,
              },
            });
      const contributionByExperimentId = new Map<string, Set<string>>();
      for (const row of ownershipRows) {
        const roles = contributionByExperimentId.get(row.experimentid) ?? new Set();
        roles.add(row.role);
        contributionByExperimentId.set(row.experimentid, roles);
      }

      const enrichedGroups = groups.map((group) => {
        const roles = contributionByExperimentId.get(group.experimentId);
        const profileContributions: Array<"creator" | "collector"> = [];
        if (roles?.has("owner")) {
          profileContributions.push("creator");
        }
        if (roles?.has("collector")) {
          profileContributions.push("collector");
        }
        return { ...group, profileContributions };
      });

      return {
        groups: enrichedGroups,
        total,
        hasMore: input.offset + groups.length < total,
      };
    }),

  /**
   * Returns public contribution counts for a profile: molecules (creator or contributor) and
   * NEXAFS experiments (creator or collector), grouped by calendar year of `createdat`.
   */
  getProfileContributionStats: publicProcedure
    .input(z.object({ userId: userRouteIdSchema }))
    .output(profileContributionStatsSchema)
    .query(async ({ ctx, input }) => {
      const userId = await resolveUserIdFromRouteSegment(ctx.db, input.userId);
      if (!userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const currentYear = new Date().getFullYear();

      const moleculesByYearRows = await ctx.db.$queryRaw<
        Array<{ year: number; count: bigint }>
      >`
        SELECT
          EXTRACT(YEAR FROM m.createdat)::int AS year,
          COUNT(DISTINCT m.id)::bigint AS count
        FROM molecules m
        LEFT JOIN molecule_contributors mc
          ON mc.molecule_id = m.id AND mc.user_id = ${userId}
        WHERE m.createdby = ${userId} OR mc.user_id IS NOT NULL
        GROUP BY 1
        ORDER BY 1
      `;

      const spectraByYearRows = await ctx.db.$queryRaw<
        Array<{ year: number; count: bigint }>
      >`
        SELECT
          EXTRACT(YEAR FROM e.createdat)::int AS year,
          COUNT(DISTINCT e.id)::bigint AS count
        FROM experiments e
        INNER JOIN experiment_contributors ec
          ON ec.experiment_id = e.id
        WHERE ec.orcid_id = ${userId}
        GROUP BY 1
        ORDER BY 1
      `;

      const moleculesByYear = fillContributionYearSeries(
        moleculesByYearRows.map((row) => ({
          year: row.year,
          count: Number(row.count),
        })),
      );
      const spectraByYear = fillContributionYearSeries(
        spectraByYearRows.map((row) => ({
          year: row.year,
          count: Number(row.count),
        })),
      );

      const molecules = moleculesByYear.reduce((sum, row) => sum + row.count, 0);
      const spectra = spectraByYear.reduce((sum, row) => sum + row.count, 0);
      const moleculesThisYear =
        moleculesByYear.find((row) => row.year === currentYear)?.count ?? 0;
      const spectraThisYear =
        spectraByYear.find((row) => row.year === currentYear)?.count ?? 0;

      return {
        moleculesByYear,
        spectraByYear,
        totals: {
          molecules,
          spectra,
          moleculesThisYear,
          spectraThisYear,
        },
      };
    }),

  /**
   * Lists users who hold a **lineage** system role (`maintainer` or `administrator` slug), for
   * public UI (e.g. transfer ownership, About listings). Intentionally slug-based to match fixed
   * `AppRole` tiers in `app-role-lineage`, not a generic permission query.
   */
  getCoreMaintainers: publicProcedure.query(async ({ ctx }) => {
    const lineageSlugs = ["maintainer", "administrator"] as const;

    const rows = await ctx.db.user.findMany({
      where: {
        userAppRoles: {
          some: {
            role: {
              slug: { in: [...lineageSlugs] },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        image: true,
        userAppRoles: {
          where: {
            role: {
              slug: { in: [...lineageSlugs] },
            },
          },
          take: 1,
          select: {
            role: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      lineageRoleSlug: row.userAppRoles[0]?.role.slug ?? null,
    }));
  }),

  getLinkedAccounts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const accounts = await ctx.db.account.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        provider: true,
        providerAccountId: true,
        type: true,
        access_token: true,
      },
    });

    const enriched = await Promise.all(
      accounts.map(async (account) => {
        if (account.provider !== "github") {
          return {
            id: account.id,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            type: account.type,
          };
        }

        const github = await resolveGitHubAccountPresentation({
          access_token: account.access_token,
        });

        return {
          id: account.id,
          provider: "github" as const,
          providerAccountId: account.providerAccountId,
          type: account.type,
          login: github.login,
          profileUrl: github.profileUrl,
          avatarUrl: github.avatarUrl,
        };
      }),
    );

    return enriched;
  }),

  unlinkAccount: protectedProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      const account = await ctx.db.account.findUnique({
        where: { id: input.accountId },
        include: {
          user: {
            include: {
              account: true,
            },
          },
        },
      });

      if (!account) {
        throw new Error("Account not found");
      }

      if (account.userId !== ctx.userId) {
        throw new Error("Unauthorized");
      }

      if (!account.user) {
        throw new Error("Account user not found");
      }

      if (account.provider === "orcid") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The ORCID account cannot be unlinked; it is your sign-in identity.",
        });
      }

      const userAccounts = account.user.account;
      if (userAccounts.length <= 1) {
        throw new Error("Cannot unlink the only account");
      }

      await ctx.db.account.delete({
        where: { id: input.accountId },
      });

      await emitAuditEvent({
        eventType: "account.unlink",
        eventScope: "users.unlinkAccount",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        payload: {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
        },
        requestMeta: auditRequestMetaFromTrpcContext({
          clientIp: ctx.clientIp,
          userAgent: ctx.userAgent,
        }),
      });

      return { success: true };
    }),

  getPasskeyEnrollmentStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return getPasskeyEnrollmentStatus(ctx.db, ctx.userId);
  }),

  getSessionWriteAssurance: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return evaluateSessionWriteAssurance(ctx.db, ctx.userId, ctx.req);
  }),

  getPasskeys: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const passkeys = await ctx.db.authenticator.findMany({
      where: { userId: ctx.userId, revokedAt: null },
      select: {
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        transports: true,
        counter: true,
        nickname: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return passkeys.map((p) => ({
      id: p.credentialID,
      credentialId: p.credentialID,
      nickname: p.nickname,
      deviceType: p.credentialDeviceType,
      backedUp: p.credentialBackedUp,
      transports: p.transports?.split(",") ?? [],
      signCount: Number(p.counter),
      createdAt: p.createdAt,
      lastUsedAt: p.lastUsedAt,
    }));
  }),

  deletePasskey: privilegedWriteProcedure
    .input(
      z.object({
        passkeyId: z.string().min(1).max(1024),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      const passkey = await ctx.db.authenticator.findUnique({
        where: { credentialID: input.passkeyId },
        include: {
          user: {
            include: {
              authenticator: {
                where: { revokedAt: null },
                select: {
                  credentialID: true,
                  aaguid: true,
                  attestationFormat: true,
                  credentialDeviceType: true,
                },
              },
              account: true,
            },
          },
        },
      });

      if (!passkey) {
        throw new Error("Passkey not found");
      }

      if (passkey.userId !== ctx.userId) {
        throw new Error("Unauthorized");
      }

      if (!passkey.user) {
        throw new Error("Passkey user not found");
      }

      const userAuthenticators = passkey.user.authenticator;
      const userAccounts = passkey.user.account;

      const hasOrcidAccount = userAccounts.some(
        (account) => account.provider === "orcid",
      );
      if (userAuthenticators.length <= 1 && !hasOrcidAccount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot remove your only sign-in method. Link ORCID or register another passkey first.",
        });
      }

      const requiresAal3 = await requiresAal3ForUser(ctx.db, ctx.userId);
      if (
        requiresAal3 &&
        isAal3Eligible({
          aaguid: passkey.aaguid,
          attestationFormat: passkey.attestationFormat,
          credentialDeviceType: passkey.credentialDeviceType,
        })
      ) {
        const otherAal3 = userAuthenticators.filter(
          (row) =>
            row.credentialID !== input.passkeyId &&
            isAal3Eligible({
              aaguid: row.aaguid,
              attestationFormat: row.attestationFormat,
              credentialDeviceType: row.credentialDeviceType,
            }),
        );
        if (otherAal3.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot revoke your only hardware security key while you hold administrator or Labs access.",
          });
        }
      }

      await ctx.db.authenticator.update({
        where: { credentialID: input.passkeyId },
        data: { revokedAt: new Date() },
      });

      await emitAuditEvent({
        eventType: "authenticator.revoke",
        eventScope: "auth.webauthn",
        actorUserId: ctx.userId,
        subjectUserId: ctx.userId,
        payload: {
          credentialID: input.passkeyId,
        },
        requestMeta: auditRequestMetaFromTrpcContext({
          clientIp: ctx.clientIp,
          userAgent: ctx.userAgent,
        }),
      });

      return { success: true };
    }),

  updateImage: protectedProcedure
    .input(
      z.object({
        image: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { image: input.image },
      });

      return { image: updatedUser.image };
    }),

  deleteAccount: privilegedWriteProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const subjectUserId = ctx.userId;
    const requestMeta = auditRequestMetaFromTrpcContext({
      clientIp: ctx.clientIp,
      userAgent: ctx.userAgent,
    });

    await ctx.db.$transaction(async (tx) => {
      await tx.experiments.deleteMany({
        where: { createdby: ctx.userId },
      });

      await tx.molecules.deleteMany({
        where: { createdby: ctx.userId },
      });

      await tx.moleculeviews.updateMany({
        where: { userid: ctx.userId },
        data: { userid: null },
      });

      await tx.authenticator.deleteMany({
        where: { userId: ctx.userId },
      });

      await tx.account.deleteMany({
        where: { userId: ctx.userId },
      });

      await tx.session.deleteMany({
        where: { userId: ctx.userId },
      });

      await tx.user.delete({
        where: { id: subjectUserId },
      });

      await emitAuditEvent({
        db: tx,
        eventType: "user.delete",
        eventScope: "users.deleteAccount",
        actorUserId: subjectUserId,
        subjectUserId,
        requestMeta,
      });
    });

    return { success: true };
  }),
});
