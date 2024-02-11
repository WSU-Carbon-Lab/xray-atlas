import { moleculeRouter } from "~/server/api/routers/molecule";
import { createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  molecule: moleculeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
