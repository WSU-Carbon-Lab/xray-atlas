import {
  ok,
  parseVersionParam,
  readRoute,
  tagOf,
} from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Channels of one linked dataset under the version's normalization. Query: `version` as for the
 * model route, and `dataset` (Atlas dataset id or UUID), required when the version links several
 * datasets. A model without a normalization is 422 `NORMALIZATION_UNDEFINED`. Responds
 * `{ experimentId, pinned, channels }`.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return readRoute(request, async (caller) => {
    const params = new URL(request.url).searchParams;
    const dataset = params.get("dataset");
    return ok(
      await caller.opticalModels.normalized({
        tag: await tagOf(context),
        version: parseVersionParam(params.get("version")),
        ...(dataset ? { dataset } : {}),
      }),
    );
  });
}
