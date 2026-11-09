import {
  ok,
  parseVersionParam,
  readRoute,
  tagOf,
  writeRoute,
} from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * One model with one version. Query `version` is `latest` (default), `draft` (owner only), or a
 * published version number. Invisible models are 404.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return readRoute(request, async (caller) =>
    ok(
      await caller.opticalModels.getByTag({
        tag: await tagOf(context),
        version: parseVersionParam(
          new URL(request.url).searchParams.get("version"),
        ),
      }),
    ),
  );
}

/**
 * Deletes a model that has never been published. Requires the `write` scope and ownership.
 * Responds `{ deleted: true }`; a model with a published version is 409.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) =>
    ok(
      await caller.opticalModels.deleteUnpublished({
        tag: await tagOf(context),
      }),
    ),
  );
}
