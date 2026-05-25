import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { orcidUserIdSchema } from "~/lib/orcid";
import { resolveUserIdFromRouteSegment } from "~/lib/user-route";

const userPublicProfileSchema = z.object({
  id: orcidUserIdSchema,
  name: z.string().nullable(),
  image: z.string().nullable(),
});

const userRouteIdSchema = z.string().min(1).max(64);

export const usersRouter = createTRPCRouter({
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

      return { success: true };
    }),

  getPasskeys: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const passkeys = await ctx.db.authenticator.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        credentialID: true,
        credentialDeviceType: true,
        credentialBackedUp: true,
        transports: true,
        counter: true,
      },
      orderBy: {
        counter: "desc",
      },
    });

    return passkeys.map((p) => ({
      id: p.id,
      deviceType: p.credentialDeviceType,
      backedUp: p.credentialBackedUp,
      transports: p.transports?.split(",") ?? [],
      lastUsed: Number(p.counter),
    }));
  }),

  deletePasskey: protectedProcedure
    .input(
      z.object({
        passkeyId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      const passkey = await ctx.db.authenticator.findUnique({
        where: { id: input.passkeyId },
        include: {
          user: {
            include: {
              authenticator: true,
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

      if (userAuthenticators.length <= 1 && userAccounts.length === 0) {
        throw new Error("Cannot delete the only authentication method");
      }

      await ctx.db.authenticator.delete({
        where: { id: input.passkeyId },
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
        where: { id: ctx.userId },
      });
    });

    return { success: true };
  }),
});
