import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getCachedAboutCollaborators } from "~/server/cache/about-public-cache";

export const collaboratorsRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return getCachedAboutCollaborators();
  }),

  getHosts: publicProcedure.query(async () => {
    const catalog = await getCachedAboutCollaborators();
    return catalog.hosts;
  }),

  getCollaborators: publicProcedure.query(async () => {
    const catalog = await getCachedAboutCollaborators();
    return catalog.collaborators;
  }),
});
