import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { computeBareAtomAbsorption } from "~/server/utils/cxro";

export const physicsRouter = createTRPCRouter({
  getBareAtomAbsorption: publicProcedure
    .input(
      z.object({
        formula: z.string().min(1, "Chemical formula is required"),
        energyMinEv: z.number().optional(),
        energyMaxEv: z.number().optional(),
        density: z.number().positive().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { formula, energyMinEv, energyMaxEv, density } = input;
      const points = await computeBareAtomAbsorption(formula, {
        energyMinEv,
        energyMaxEv,
        density,
      });
      return {
        formula,
        points,
      };
    }),
});
