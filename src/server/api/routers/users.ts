import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
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

const contributionAgreementStatusSchema = z.object({
  accepted: z.boolean(),
  acceptedAt: z.date().nullable(),
  agreementVersion: z.string().nullable(),
  currentVersion: z.string(),
  needsAcceptance: z.boolean(),
});

const userPublicProfileSchema = z.object({
  id: orcidUserIdSchema,
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const userRouteIdSchema = z.string().min(1).max(64);

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
      const isSelf = ctx.userId === userId;

      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          image: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (!isSelf) {
        return user;
      }

      return user;
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
      },
    });

    return accounts;
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

  deletePasskey: protectedProcedure
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

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
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
