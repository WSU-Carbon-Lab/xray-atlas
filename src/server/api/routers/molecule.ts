import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const moleculeRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.molecularRecord.findMany({
      orderBy: { createdAt: "desc" },
    });
  }),
});
