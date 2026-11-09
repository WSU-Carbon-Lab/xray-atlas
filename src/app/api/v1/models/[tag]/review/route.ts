import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Approves or rejects the model on a dataset the caller may edit. Body: `{ experimentId, state:
 * "approved" | "rejected", note? }`. A rejection is recorded and never changes visibility or
 * deletes the model. Requires the `write` scope. Responds `{ tag, experimentId, state }`.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.review({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"review">),
    );
  });
}
