import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  DEV_MOCK_USER,
  DEV_MOCK_LINKED_ACCOUNTS,
  DEV_MOCK_PASSKEYS,
  isDevMockUser,
} from "~/lib/dev-mock-data";
import { normalizeOrcidUserInput, orcidIdSchema } from "~/lib/orcid";

const userPublicProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  image: z.string().nullable(),
  orcid: z.string().nullable(),
  email: z.string().nullable(),
});

export const usersRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      return DEV_MOCK_USER;
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
    .input(z.object({ id: z.string().uuid() }))
    .output(userPublicProfileSchema)
    .query(async ({ ctx, input }) => {
      const isSelf = ctx.userId === input.id;

      if (isDevMockUser(input.id)) {
        if (!isSelf) {
          return {
            id: DEV_MOCK_USER.id,
            name: DEV_MOCK_USER.name,
            image: DEV_MOCK_USER.image,
            orcid: DEV_MOCK_USER.orcid,
            email: null,
          };
        }
        return {
          id: DEV_MOCK_USER.id,
          name: DEV_MOCK_USER.name,
          image: DEV_MOCK_USER.image,
          orcid: DEV_MOCK_USER.orcid,
          email: DEV_MOCK_USER.email,
        };
      }

      if (isSelf) {
        const user = await ctx.db.user.findUnique({
          where: { id: input.id },
          select: {
            id: true,
            name: true,
            image: true,
            orcid: true,
            email: true,
          },
        });
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        return user;
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          image: true,
          orcid: true,
        },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return { ...user, email: null };
    }),

  getCoreMaintainers: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: {
        userAppRoles: {
          some: {
            role: {
              slug: { in: ["maintainer", "administrator"] },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, image: true },
    });
  }),

  updateORCID: protectedProcedure
    .input(
      z.object({
        orcid: orcidIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
        return { ...DEV_MOCK_USER, orcid: input.orcid };
      }

      const orcidId = normalizeOrcidUserInput(input.orcid);

      const user = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { orcid: orcidId },
      });

      return user;
    }),

  removeORCID: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      return { ...DEV_MOCK_USER, orcid: null };
    }

    const user = await ctx.db.user.update({
      where: { id: ctx.userId },
      data: { orcid: null },
    });

    return user;
  }),

  getLinkedAccounts: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      return DEV_MOCK_LINKED_ACCOUNTS;
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

      if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
        throw new Error("Cannot modify accounts in dev mode");
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

      const userAccounts = account.user.account;
      if (userAccounts.length <= 1) {
        throw new Error("Cannot unlink the only account");
      }

      await ctx.db.account.delete({
        where: { id: input.accountId },
      });

      if (account.provider === "orcid") {
        await ctx.db.user.update({
          where: { id: ctx.userId },
          data: { orcid: null },
        });
      }

      return { success: true };
    }),

  getPasskeys: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      return DEV_MOCK_PASSKEYS;
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

      if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
        throw new Error("Cannot modify passkeys in dev mode");
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

      if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
        throw new Error("Cannot modify user image in dev mode");
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { image: input.image },
      });

      return { image: updatedUser.image };
    }),

  updateEmail: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new Error("User not authenticated");
      }

      if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
        return { ...DEV_MOCK_USER, email: input.email };
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.userId },
        data: { email: input.email },
      });

      return { email: updatedUser.email };
    }),

  removeEmail: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      return { ...DEV_MOCK_USER, email: null };
    }

    const updatedUser = await ctx.db.user.update({
      where: { id: ctx.userId },
      data: { email: null },
    });

    return { email: updatedUser.email };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    if (ctx.isDevMock && isDevMockUser(ctx.userId)) {
      throw new Error("Cannot delete account in dev mode");
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.experiments.deleteMany({
        where: { createdby: ctx.userId },
      });

      await tx.molecules.deleteMany({
        where: { createdby: ctx.userId },
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
