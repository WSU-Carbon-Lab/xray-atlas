import { clerkClient } from "@clerk/nextjs";
import { User } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const fileterUserForClient = (user: User) => {
  return {
    id: user.id,
    username: user.username,
    imageUrl: user.imageUrl,
  };
}

export const moleculeRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const molecules = await ctx.db.molecularRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const users = (
      await clerkClient.users.getUserList({
        userId: molecules.map((molecule) => molecule.authorId),
        limit: 100,
      })
    ).map(fileterUserForClient);

    return molecules.map((molecule) => {
      const author = users.find((user) => user.id === molecule.authorId);

      if (!author || !author.username)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Author not found",
        });

      return {
        molecule,
        author,
      };
    });
  }),
});
