/**
 * Runs one read-only statement against the public spectrum export.
 *
 * The body is `{ sql, limit }`. `sql` may read `spectrum_points` only.
 * `limit` defaults to 100 and cannot exceed 10000.
 */

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { rejectInvalidPresentedBearer } from "~/server/cli/access-token";
import {
  runSpectrumSelect,
  SpectrumQueryError,
} from "~/server/catalog/spectrum-query";

const bodySchema = z.object({
  sql: z.string().trim().min(1).max(8_000),
  limit: z.number().int().min(1).max(10_000).optional(),
});

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Executes the posted SELECT and returns the capped rows as JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const bearerRejection = await rejectInvalidPresentedBearer(request);
  if (bearerRejection) {
    return bearerRejection;
  }
  try {
    const payload: unknown = await request.json();
    const body = bodySchema.parse(payload);
    const result = await runSpectrumSelect(body.sql, body.limit ?? 100);
    return NextResponse.json({
      columns: result.columns,
      rowCount: result.rows.length,
      truncated: result.truncated,
      rows: result.rows,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError(
        error.issues[0]?.message ?? "Invalid query parameters.",
        400,
      );
    }
    if (error instanceof SpectrumQueryError) {
      return jsonError(error.message, 400);
    }
    if (error instanceof SyntaxError) {
      return jsonError("Query body must be JSON.", 400);
    }
    return jsonError(publicDatabaseMessage(error), 500);
  }
}

function publicDatabaseMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "";
  const first = raw.split("\n")[0] ?? "";
  if (
    /spectrumpoints|experiments|next_auth|pg_|password|secret/iu.test(first)
  ) {
    return "The query could not run.";
  }
  if (
    /^(column |syntax error|operator does not exist|function |aggregate )/iu.test(
      first,
    )
  ) {
    return first.slice(0, 240);
  }
  return "The query could not run.";
}
