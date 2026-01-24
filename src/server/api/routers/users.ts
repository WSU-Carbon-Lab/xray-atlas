import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { auth } from "~/server/auth";

export const usersRouter = createTRPCRouter({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.users.findUnique({
      where: { nextAuthId: ctx.userId },
    });

    if (!user) {
      throw new Error("User not found in database");
    }

    return user;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.users.findUnique({
        where: { id: input.id },
        include: {
          experiments: {
            take: 10,
            orderBy: {
              createdat: "desc",
            },
          },
          _count: {
            select: {
              molecules: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  acceptContributionAgreement: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.users.update({
      where: { nextAuthId: ctx.userId },
      data: {
        contributionAgreementAccepted: true,
        contributionAgreementDate: new Date(),
      },
    });

    return { success: true, user };
  }),

  getContributionAgreementStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.users.findUnique({
      where: { nextAuthId: ctx.userId },
      select: {
        contributionAgreementAccepted: true,
        contributionAgreementDate: true,
      },
    });

    return {
      accepted: user?.contributionAgreementAccepted ?? false,
      date: user?.contributionAgreementDate ?? null,
    };
  }),
});
