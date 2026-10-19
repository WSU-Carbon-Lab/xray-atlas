import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import {
  formatDatasetVersion,
  type DatasetVersion,
} from "~/server/nexafs/dataset-versioning";
import {
  handleV1,
  requireBearerScope,
  V1HttpError,
} from "~/app/api/v1/_lib/write-api";

export const dynamic = "force-dynamic";

const experimentIdSchema = z.string().uuid();

function versionOf(row: {
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
}): string {
  const version: DatasetVersion = {
    major: row.versionMajor,
    minor: row.versionMinor,
    patch: row.versionPatch,
  };
  return formatDatasetVersion(version);
}

/**
 * Lists the revision history of one dataset, newest first.
 *
 * Requires `Authorization: Bearer` with the `read` scope. Each entry carries `version`,
 * `changeKind` (`baseline`, `normalization`, `kk_first_calculation`, `kk_recalculation`,
 * `aux_added`, `aux_removed`), `level` (`major`, `minor`, `patch`, or null for the baseline),
 * the actor ORCID iD (null for the baseline), `createdAt`, and the linked Zenodo version
 * (`label`, `doi`, `status`) when one exists. `currentVersion` is the dataset's live version.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ experimentId: string }> },
): Promise<NextResponse> {
  return handleV1(async () => {
    await requireBearerScope(request, "read");
    const parsedId = experimentIdSchema.safeParse(
      (await context.params).experimentId,
    );
    if (!parsedId.success) {
      throw new V1HttpError(
        422,
        "UNPROCESSABLE_ENTITY",
        "experimentId must be a UUID.",
      );
    }
    const experiment = await db.experiments.findUnique({
      where: { id: parsedId.data },
      select: {
        id: true,
        datasetVersionMajor: true,
        datasetVersionMinor: true,
        datasetVersionPatch: true,
        revisions: {
          orderBy: [
            { versionMajor: "desc" },
            { versionMinor: "desc" },
            { versionPatch: "desc" },
          ],
          select: {
            versionMajor: true,
            versionMinor: true,
            versionPatch: true,
            changeKind: true,
            actorUserId: true,
            createdAt: true,
            zenodoVersion: {
              select: { versionLabel: true, doi: true, status: true },
            },
          },
        },
      },
    });
    if (!experiment) {
      throw new V1HttpError(404, "NOT_FOUND", "Experiment not found");
    }
    const levelFor = (
      row: (typeof experiment.revisions)[number],
    ): "major" | "minor" | "patch" | null => {
      if (row.changeKind === "baseline") return null;
      if (row.versionPatch > 0) return "patch";
      if (row.versionMinor > 0) return "minor";
      return "major";
    };
    return NextResponse.json(
      {
        experimentId: experiment.id,
        currentVersion: versionOf({
          versionMajor: experiment.datasetVersionMajor,
          versionMinor: experiment.datasetVersionMinor,
          versionPatch: experiment.datasetVersionPatch,
        }),
        revisions: experiment.revisions.map((row) => ({
          version: versionOf(row),
          changeKind: row.changeKind,
          level: levelFor(row),
          actorOrcid: row.actorUserId,
          createdAt: row.createdAt.toISOString(),
          zenodo: row.zenodoVersion
            ? {
                label: row.zenodoVersion.versionLabel,
                doi: row.zenodoVersion.doi,
                status: row.zenodoVersion.status,
              }
            : null,
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}
