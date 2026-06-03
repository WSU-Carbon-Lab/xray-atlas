import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  attributionDisplayPreferencesSchema,
  autoAcceptModeSchema,
} from "~/lib/dataset-attribution-claim";
import {
  countPendingAttributionsForOrcid,
  getAttributionPreferencesForUser,
  listPendingAttributionsForOrcid,
  setAttributionPreferencesForUser,
  updateContributorClaimForSessionUser,
} from "~/server/nexafs/datasetAttributionClaiming";

const attributionPreferencesSchema = z.object({
  autoAcceptMode: autoAcceptModeSchema,
  displayPreferences: attributionDisplayPreferencesSchema,
});

export const datasetAttributionsRouter = createTRPCRouter({
  countPendingForSession: protectedProcedure.query(async ({ ctx }) => {
    const count = await countPendingAttributionsForOrcid(ctx.db, ctx.userId);
    return { count };
  }),

  listPendingForSession: protectedProcedure.query(async ({ ctx }) => {
    return listPendingAttributionsForOrcid(ctx.db, ctx.userId);
  }),

  acceptAttribution: protectedProcedure
    .input(z.object({ contributorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return updateContributorClaimForSessionUser(ctx.db, {
        contributorId: input.contributorId,
        sessionOrcid: ctx.userId,
        nextStatus: "accepted",
      });
    }),

  declineAttribution: protectedProcedure
    .input(z.object({ contributorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return updateContributorClaimForSessionUser(ctx.db, {
        contributorId: input.contributorId,
        sessionOrcid: ctx.userId,
        nextStatus: "declined",
      });
    }),

  unclaimAttribution: protectedProcedure
    .input(z.object({ contributorId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return updateContributorClaimForSessionUser(ctx.db, {
        contributorId: input.contributorId,
        sessionOrcid: ctx.userId,
        nextStatus: "unclaimed",
      });
    }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return getAttributionPreferencesForUser(ctx.db, ctx.userId);
  }),

  setPreferences: protectedProcedure
    .input(attributionPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return setAttributionPreferencesForUser(ctx.db, ctx.userId, input);
    }),
});
