import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Shares the model with an ORCID iD. Body: `{ orcid }`. A private model becomes `shared`. Owner
 * only; requires the `write` scope. Responds `{ tag, orcid }`.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.share({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"share">),
    );
  });
}

/**
 * Removes a share. Body: `{ orcid }`. Idempotent. Owner only; requires the `write` scope.
 * Responds `{ tag, orcid }`.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request);
    return ok(
      await caller.opticalModels.unshare({
        ...body,
        tag: await tagOf(context),
      } as unknown as ModelInput<"unshare">),
    );
  });
}
