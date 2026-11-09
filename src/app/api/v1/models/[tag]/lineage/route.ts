import {
  ok,
  parseVersionParam,
  readRoute,
  tagOf,
} from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Visible ancestors of one version, newest first, with the count of ancestors the caller cannot
 * see. Query `version` as for the model route. Responds `{ ancestors, hiddenAncestors }`.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return readRoute(request, async (caller) =>
    ok(
      await caller.opticalModels.lineage({
        tag: await tagOf(context),
        version: parseVersionParam(
          new URL(request.url).searchParams.get("version"),
        ),
      }),
    ),
  );
}
