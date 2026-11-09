/**
 * Optical models tRPC router.
 *
 * Merges the query and mutation procedure sets into one router mounted as `opticalModels`.
 * Contains no logic of its own.
 */

import { createTRPCRouter } from "~/server/api/trpc";
import { opticalModelCitationProcedures } from "~/server/api/routers/optical-models/citation";
import { opticalModelMutationProcedures } from "~/server/api/routers/optical-models/mutations";
import { opticalModelNormalizedProcedures } from "~/server/api/routers/optical-models/normalized";
import { opticalModelQueryProcedures } from "~/server/api/routers/optical-models/queries";
import { opticalModelTensorProcedures } from "~/server/api/routers/optical-models/tensor";

export const opticalModelsRouter = createTRPCRouter({
  ...opticalModelQueryProcedures,
  ...opticalModelMutationProcedures,
  ...opticalModelTensorProcedures,
  ...opticalModelNormalizedProcedures,
  ...opticalModelCitationProcedures,
});
