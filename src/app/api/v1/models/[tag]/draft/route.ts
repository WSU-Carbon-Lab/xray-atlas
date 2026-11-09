import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Replaces the fields present in the body on the model's draft, creating the draft from the latest
 * published version when none exists. Body: `{ title?, description?, normalization?, peaks?,
 * datasets? }` (the draft content schema). Owner only; requires the `write` scope. Responds
 * `{ tag }`.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const content = await readObjectBody(request);
    return ok(
      await caller.opticalModels.saveDraft({
        tag: await tagOf(context),
        content,
      } as unknown as ModelInput<"saveDraft">),
    );
  });
}
