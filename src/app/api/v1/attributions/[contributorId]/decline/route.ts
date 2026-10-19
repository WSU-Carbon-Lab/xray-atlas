import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { updateContributorClaimForSessionUser } from "~/server/nexafs/datasetAttributionClaiming";
import {
  handleV1,
  requireBearerScope,
  V1HttpError,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

const contributorIdSchema = z.string().uuid();

/**
 * Declines one pending dataset attribution claim for the token owner.
 *
 * Requires `Authorization: Bearer` with the `write` scope. `contributorId` is the `id` from
 * `GET /api/v1/attributions`. The claim logic is
 * `updateContributorClaimForSessionUser`, shared with the web flow: rows addressed to another
 * ORCID iD answer 403. Responds with `{ updated: true, experimentId }`.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ contributorId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    const parsed = contributorIdSchema.safeParse(
      (await context.params).contributorId,
    );
    if (!parsed.success) {
      throw new V1HttpError(
        422,
        "UNPROCESSABLE_ENTITY",
        "contributorId must be a UUID.",
      );
    }
    const result = await updateContributorClaimForSessionUser(db, {
      contributorId: parsed.data,
      sessionOrcid: bearer.userId,
      nextStatus: "declined",
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  });
}
