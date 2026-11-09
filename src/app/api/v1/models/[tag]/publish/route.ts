import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Publishes the draft as the next immutable version. No body. Owner only; requires the `write`
 * scope. Responds `{ versionNumber, checksum }`; no draft or a concurrent publish is 409, and a
 * draft with no dataset link or no content is 422.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) =>
    ok(await caller.opticalModels.publish({ tag: await tagOf(context) })),
  );
}
