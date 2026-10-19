import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { listPendingAttributionsForOrcid } from "~/server/nexafs/datasetAttributionClaiming";
import { handleV1, requireBearerScope } from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

/**
 * Lists the pending dataset attribution claims addressed to the token owner's ORCID iD.
 *
 * Requires `Authorization: Bearer` with the `read` scope. Responds with
 * `{ attributions: [{ id, experimentId, role, claimStatus, createdAt, experiment }] }` where `id`
 * is the contributor row id used by the accept and decline routes.
 */
export async function GET(request: Request): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "read");
    const rows = await listPendingAttributionsForOrcid(db, bearer.userId);
    return NextResponse.json(
      {
        attributions: rows.map((row) => ({
          id: row.contributorId,
          experimentId: row.experimentId,
          role: row.role,
          claimStatus: row.claimStatus,
          createdAt: row.createdAt.toISOString(),
          experiment: {
            id: row.experiment.id,
            createdAt: row.experiment.createdAt.toISOString(),
            moleculeName: row.experiment.moleculeName,
            edgeLabel: row.experiment.edgeLabel,
            instrumentName: row.experiment.instrumentName,
            facilityName: row.experiment.facilityName,
          },
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
