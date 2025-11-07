import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { currentUser } from "@clerk/nextjs/server";

export const usersRouter = createTRPCRouter({
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      throw new Error("User not found");
    }

    const user = await ctx.db.users.upsert({
      where: {
        clerkid: clerkUser.id,
      },
      update: {
        name:
          (clerkUser.fullName ??
            `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()) ||
          "User",
        imageurl: clerkUser.imageUrl ?? undefined,
        orcid: clerkUser.username ?? undefined,
      },
      create: {
        id: clerkUser.id,
        clerkid: clerkUser.id,
        name:
          (clerkUser.fullName ??
            `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()) ||
          "User",
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        imageurl: clerkUser.imageUrl ?? undefined,
        orcid: clerkUser.username ?? undefined,
      },
    });

    return { success: true, user };
  }),

  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db.users.findUnique({
      where: { clerkid: ctx.userId },
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
});
