import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Signed URL for uploading a tensor blob to the model's draft. Body: `{ sizeBytes, sha256 }` (at
 * most 128 MiB; lowercase SHA-256 hex). Owner only; requires the `write` scope. Responds
 * `{ uploadUrl, storagePath }`; PUT the bytes to `uploadUrl`, then commit.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.tensorUploadUrl({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"tensorUploadUrl">),
    );
  });
}
