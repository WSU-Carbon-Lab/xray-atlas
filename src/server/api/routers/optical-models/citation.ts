/**
 * `citation` query of the optical models router.
 *
 * Returns the BibTeX record of a visible published model version as `{ bibtex }`.
 */

import { z } from "zod";
import { publicProcedure } from "~/server/api/trpc";
import { buildModelBibtex } from "~/server/optical-models/citation";
import { modelViewerFromContext } from "~/server/optical-models/viewer";

/** Citation procedures of the `opticalModels` router. */
export const opticalModelCitationProcedures = {
  /** BibTeX of a published version (`latest` by default). */
  citation: publicProcedure
    .input(
      z.object({
        tag: z.string().trim().min(1).max(32),
        version: z
          .union([z.literal("latest"), z.number().int().min(1)])
          .default("latest"),
      }),
    )
    .query(async ({ ctx, input }) => ({
      bibtex: await buildModelBibtex(ctx.db, modelViewerFromContext(ctx), {
        tag: input.tag,
        version: input.version,
      }),
    })),
};
