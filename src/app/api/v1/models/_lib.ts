/**
 * Shared helpers of the `/api/v1/models` routes.
 *
 * Owns the response helper, the `version` query parser, and the two route wrappers: `readRoute`
 * (anonymous or token, public data for anonymous callers) and `writeRoute` (token with the `write`
 * scope). Holds no model logic; procedures enforce visibility, ownership, and consent.
 */

import { NextResponse } from "next/server";
import {
  createOptionalBearerCaller,
  createV1Caller,
  handleV1,
  requireBearerScope,
  V1HttpError,
  type V1Caller,
} from "~/app/api/v1/_lib/write-api";

/** Which version a route reads: the latest published, the owner's draft, or a version number. */
export type ModelVersionParam = "latest" | "draft" | number;

/**
 * JSON response with `cache-control: no-store`, because every model response depends on the viewer.
 *
 * @param body - JSON-serializable object.
 * @param status - HTTP status, default 200.
 */
export function ok(body: object, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/**
 * Parses the `version` query parameter.
 *
 * @param raw - Raw value, or `null` when absent.
 * @returns `latest` when absent, `draft`, or a positive integer.
 * @throws {V1HttpError} 422 when the value is anything else.
 */
export function parseVersionParam(raw: string | null): ModelVersionParam {
  if (raw === null || raw === "" || raw === "latest") return "latest";
  if (raw === "draft") return "draft";
  if (/^[1-9][0-9]*$/.test(raw)) return Number(raw);
  throw new V1HttpError(
    422,
    "UNPROCESSABLE_ENTITY",
    "version must be latest, draft, or a positive integer.",
  );
}

/**
 * Reads the model tag from route params.
 *
 * @param context - Next route context with `params`.
 */
export async function tagOf(context: {
  params: Promise<{ tag: string }>;
}): Promise<string> {
  return (await context.params).tag;
}

/**
 * Runs a read route. Anonymous callers see public models; a valid token also sees its own and
 * shared models; an invalid token is 401.
 *
 * @param request - Incoming request.
 * @param run - Route logic receiving the caller.
 */
export async function readRoute(
  request: Request,
  run: (caller: V1Caller) => Promise<NextResponse>,
): Promise<NextResponse> {
  return handleV1(async () => run(await createOptionalBearerCaller(request)));
}

/**
 * Runs a write route. Requires a valid bearer token with the `write` scope.
 *
 * @param request - Incoming request.
 * @param run - Route logic receiving the caller.
 */
export async function writeRoute(
  request: Request,
  run: (caller: V1Caller) => Promise<NextResponse>,
): Promise<NextResponse> {
  return handleV1(async () => {
    const bearer = await requireBearerScope(request, "write");
    return run(createV1Caller(bearer, request));
  });
}
