import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Sets visibility. Body: `{ visibility: "private" | "shared" | "public" }`. Owner only; requires
 * the `write` scope. `public` needs every ancestor model to be public (422 `ANCESTOR_NOT_PUBLIC`).
 * Responds `{ tag, visibility }`.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.setVisibility({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"setVisibility">),
    );
  });
}
