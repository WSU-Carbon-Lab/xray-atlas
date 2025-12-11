import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const collaboratorsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const collaborators = await ctx.db.collaborators.findMany({
      orderBy: [
        { ishost: "desc" },
        { displayorder: "asc" },
        { name: "asc" },
      ],
    });

    return {
      hosts: collaborators.filter((c) => c.ishost),
      collaborators: collaborators.filter((c) => !c.ishost),
    };
  }),

  getHosts: publicProcedure.query(async ({ ctx }) => {
    const hosts = await ctx.db.collaborators.findMany({
      where: { ishost: true },
      orderBy: [{ displayorder: "asc" }, { name: "asc" }],
    });

    return hosts;
  }),

  getCollaborators: publicProcedure.query(async ({ ctx }) => {
    const collaborators = await ctx.db.collaborators.findMany({
      where: { ishost: false },
      orderBy: [{ displayorder: "asc" }, { name: "asc" }],
    });

    return collaborators;
  }),
});
