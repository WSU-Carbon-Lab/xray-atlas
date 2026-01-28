import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

const orcidIdSchema = z
  .string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "Invalid ORCID iD format. Expected format: XXXX-XXXX-XXXX-XXXX")
  .or(z.string().url().refine((url) => url.includes("orcid.org"), "Must be a valid ORCID URL"));

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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
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
});
