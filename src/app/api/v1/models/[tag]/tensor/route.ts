import {
  ok,
  parseVersionParam,
  readRoute,
  tagOf,
} from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Short-lived signed read URL of a version's tensor with its SHA-256, byte size, and manifest.
 * Query `version` as for the model route. A version without a tensor is 404.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return readRoute(request, async (caller) =>
    ok(
      await caller.opticalModels.tensorDownloadUrl({
        tag: await tagOf(context),
        version: parseVersionParam(
          new URL(request.url).searchParams.get("version"),
        ),
      }),
    ),
  );
}
