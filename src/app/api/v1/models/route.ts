import { z } from "zod";
import { V1HttpError } from "~/app/api/v1/_lib/write-api";
import { ok, readRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  dataset: z.string().trim().min(1).max(64).optional(),
  scope: z.enum(["public", "mine", "shared", "all"]).default("all"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Lists optical models.
 *
 * Query: `dataset` (Atlas dataset id or experiment UUID) lists the models visible to the caller
 * that link that dataset, filtered by `scope` (`public`, `mine`, `shared`, `all`, default `all`).
 * Without `dataset`, `scope=mine` pages the caller's own models and `scope=shared` pages models
 * shared with the caller (both need a token; `cursor` and `limit` 1 to 100 apply). Anything else is
 * 422. Responds `{ items, nextCursor }`.
 */
export async function GET(request: Request) {
  return readRoute(request, async (caller) => {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (query.dataset) {
      const items = await caller.opticalModels.listForDataset({
        dataset: query.dataset,
        scope: query.scope,
      });
      return ok({ items, nextCursor: null });
    }
    const page = {
      ...(query.cursor ? { cursor: query.cursor } : {}),
      limit: query.limit,
    };
    if (query.scope === "mine") {
      return ok(await caller.opticalModels.listMine(page));
    }
    if (query.scope === "shared") {
      return ok(await caller.opticalModels.listSharedWithMe(page));
    }
    throw new V1HttpError(
      422,
      "UNPROCESSABLE_ENTITY",
      "dataset is required unless scope is mine or shared.",
    );
  });
}
