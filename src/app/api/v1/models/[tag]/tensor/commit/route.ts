import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Attaches an uploaded blob to the draft after the server verifies its size and SHA-256. Body:
 * `{ storagePath, sizeBytes, sha256, manifest }`. Owner only; requires the `write` scope. Responds
 * `{ tag, storagePath }`; a size or digest mismatch is 422.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.tensorCommit({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"tensorCommit">),
    );
  });
}
