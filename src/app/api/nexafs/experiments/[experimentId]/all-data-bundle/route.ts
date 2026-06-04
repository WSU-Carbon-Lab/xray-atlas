import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { buildDatasetAllDataBundle } from "~/server/nexafs/datasetAllDataBundle";

const experimentIdSchema = z.string().uuid();

/**
 * GET streams a gzip-compressed tar of spectrum CSV plus committed experiment/sample auxiliary files.
 * Authz matches public browse dataset read (no contributor edit gate).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ experimentId: string }> },
): Promise<Response> {
  const { experimentId } = await context.params;
  const parsed = experimentIdSchema.safeParse(experimentId);
  if (!parsed.success) {
    return new Response("Invalid experiment id", { status: 400 });
  }

  try {
    const { buffer, downloadFilename } = await buildDatasetAllDataBundle(
      db,
      parsed.data,
    );
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${downloadFilename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return new Response(error.message, { status: 404 });
    }
    console.error("[all-data-bundle]", error);
    return new Response("Failed to build dataset bundle", { status: 500 });
  }
}
