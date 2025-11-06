import { createTRPCRouter } from "~/server/api/trpc";
import { moleculesRouter } from "~/server/api/routers/molecules";
import { usersRouter } from "~/server/api/routers/users";
import { experimentsRouter } from "~/server/api/routers/experiments";
import { samplesRouter } from "~/server/api/routers/samples";
import { instrumentsRouter } from "~/server/api/routers/instruments";
import { publicationsRouter } from "~/server/api/routers/publications";
import { spectrumpointsRouter } from "~/server/api/routers/spectrumpoints";
import { externalRouter } from "~/server/api/routers/external";

export const appRouter = createTRPCRouter({
  molecules: moleculesRouter,
  users: usersRouter,
  experiments: experimentsRouter,
  samples: samplesRouter,
  instruments: instrumentsRouter,
  publications: publicationsRouter,
  spectrumpoints: spectrumpointsRouter,
  external: externalRouter,
});

export type AppRouter = typeof appRouter;
