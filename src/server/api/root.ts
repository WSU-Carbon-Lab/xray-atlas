import { createTRPCRouter } from "~/server/api/trpc";
import { moleculesRouter } from "~/server/api/routers/molecules";
import { usersRouter } from "~/server/api/routers/users";
import { experimentsRouter } from "~/server/api/routers/experiments";
import { samplesRouter } from "~/server/api/routers/samples";
import { instrumentsRouter } from "~/server/api/routers/instruments";
import { facilitiesRouter } from "~/server/api/routers/facilities";
import { publicationsRouter } from "~/server/api/routers/publications";
import { spectrumpointsRouter } from "~/server/api/routers/spectrumpoints";
import { externalRouter } from "~/server/api/routers/external";
import { vendorsRouter } from "~/server/api/routers/vendors";
import { physicsRouter } from "~/server/api/routers/physics";
import { collaboratorsRouter } from "~/server/api/routers/collaborators";
import { adminRouter } from "~/server/api/routers/admin";
import { sampleAuxRouter } from "~/server/api/routers/sampleAux";
import { sampleFileRouter } from "~/server/api/routers/sampleFile";
import { experimentFileRouter } from "~/server/api/routers/experimentFile";
import { attributionTeamsRouter } from "~/server/api/routers/attributionTeams";
import { datasetAttributionsRouter } from "~/server/api/routers/datasetAttributions";

export const appRouter = createTRPCRouter({
  molecules: moleculesRouter,
  admin: adminRouter,
  users: usersRouter,
  experiments: experimentsRouter,
  samples: samplesRouter,
  instruments: instrumentsRouter,
  facilities: facilitiesRouter,
  publications: publicationsRouter,
  spectrumpoints: spectrumpointsRouter,
  external: externalRouter,
  vendors: vendorsRouter,
  physics: physicsRouter,
  collaborators: collaboratorsRouter,
  sampleAux: sampleAuxRouter,
  sampleFile: sampleFileRouter,
  experimentFile: experimentFileRouter,
  attributionTeams: attributionTeamsRouter,
  datasetAttributions: datasetAttributionsRouter,
});

export type AppRouter = typeof appRouter;
