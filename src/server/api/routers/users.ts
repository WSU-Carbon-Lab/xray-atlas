import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import {
  DEV_MOCK_USER,
  DEV_MOCK_LINKED_ACCOUNTS,
  DEV_MOCK_PASSKEYS,
  DEV_MOCK_MOLECULES,
  isDevMockUser,
} from "~/lib/dev-mock-data";

const orcidIdSchema = z
  .string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID iD format. Expected format: XXXX-XXXX-XXXX-XXXX")
  .or(z.string().url().refine((url) => url.includes("orcid.org"), "Must be a valid ORCID URL"));

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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.isDevMock && isDevMockUser(input.id)) {
        return DEV_MOCK_USER;
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
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

      let orcidId = input.orcid;
      if (orcidId.startsWith("https://")) {
        orcidId = orcidId.replace("https://orcid.org/", "").replace("https://sandbox.orcid.org/", "");
      }
      if (orcidId.startsWith("http://")) {
        orcidId = orcidId.replace("http://orcid.org/", "").replace("http://sandbox.orcid.org/", "");
      }

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
});
