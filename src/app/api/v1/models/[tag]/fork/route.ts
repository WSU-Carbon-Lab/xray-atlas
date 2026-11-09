import { readObjectBody, type ModelInput } from "~/app/api/v1/models/_body";
import { ok, tagOf, writeRoute } from "~/app/api/v1/models/_lib";

export const dynamic = "force-dynamic";

/**
 * Creates a private model as a fork of a visible published version of `{tag}`. Body (optional):
 * `{ fromVersion?: number, title?: string }`. Requires the `write` scope. Responds 201
 * `{ tag }` with the new model's tag.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ tag: string }> },
) {
  return writeRoute(request, async (caller) => {
    const body = await readObjectBody(request, { optional: true });
    const result = await caller.opticalModels.fork({
      ...body,
      tag: await tagOf(context),
    } as unknown as ModelInput<"fork">);
    return ok(result, 201);
  });
}
