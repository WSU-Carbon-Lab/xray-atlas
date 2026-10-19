/**
 * Shared plumbing for `/api/v1` routes that authenticate with a CLI bearer token and delegate
 * to existing tRPC procedures.
 *
 * Owns bearer authentication with scope checks, construction of a server-side tRPC caller bound
 * to the token identity, JSON body parsing, and the mapping of tRPC and Zod failures to the
 * `{ error: { code, message } }` envelope. It holds no business rules: authorization, agreement
 * enforcement, version-bump confirmation, and input validation stay in the procedures.
 * Cookie sessions are never consulted here.
 */

import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { db } from "~/server/db";
import { appRouter } from "~/server/api/root";
import { createCallerFactory } from "~/server/api/trpc";
import {
  resolveBearerContext,
  type BearerContext,
  type CliScope,
} from "~/server/cli/cli-scopes";

/** JSON value as produced by `JSON.parse`. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Error codes of the `/api/v1` write-route error envelope. */
export type V1ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BAD_REQUEST"
  | "UNPROCESSABLE_ENTITY"
  | "INTERNAL_SERVER_ERROR";

const createCaller = createCallerFactory(appRouter);

/** Server-side tRPC caller type bound to a token identity. */
export type V1Caller = ReturnType<typeof createCaller>;

/** Thrown by {@link readJsonBody} when the request body is not parseable JSON. */
export class MalformedJsonError extends Error {
  constructor() {
    super("Request body is not valid JSON.");
    this.name = "MalformedJsonError";
  }
}

/** Thrown by route code to answer with a specific envelope status. */
export class V1HttpError extends Error {
  readonly status: number;
  readonly code: V1ErrorCode;

  constructor(status: number, code: V1ErrorCode, message: string) {
    super(message);
    this.name = "V1HttpError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Builds the error envelope response.
 *
 * @param status - HTTP status code.
 * @param code - Stable machine-readable error code.
 * @param message - Human-readable message, passed through unchanged from the server where available.
 * @param appCode - Optional application code (for example `CONTRIBUTION_AGREEMENT_REQUIRED`).
 */
export function v1ErrorResponse(
  status: number,
  code: V1ErrorCode,
  message: string,
  appCode?: string,
): NextResponse {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  if (status === 401) {
    headers["www-authenticate"] = "Bearer";
  }
  return NextResponse.json(
    { error: appCode ? { code, message, appCode } : { code, message } },
    { status, headers },
  );
}

/**
 * Authenticates a request by bearer token only and checks one scope.
 *
 * @param request - Incoming request; only the `Authorization` header is read.
 * @param scope - Scope the route needs (`write` for mutations, `read` for reads).
 * @returns The token context.
 * @throws {V1HttpError} 401 when the bearer is absent, malformed, expired, or revoked; 403 when
 *   the token lacks `scope`.
 */
export async function requireBearerScope(
  request: Request,
  scope: CliScope,
): Promise<BearerContext> {
  const bearer = await resolveBearerContext(
    request.headers.get("authorization"),
  );
  if (!bearer) {
    throw new V1HttpError(
      401,
      "UNAUTHORIZED",
      "A valid Authorization: Bearer token is required.",
    );
  }
  if (!bearer.scopes.includes(scope)) {
    throw new V1HttpError(
      403,
      "FORBIDDEN",
      `CLI_TOKEN_SCOPE_FORBIDDEN: this token lacks the ${scope} scope.`,
    );
  }
  return bearer;
}

/**
 * Creates a tRPC caller acting as the token owner.
 *
 * @param bearer - Resolved token context.
 * @param request - Request whose client IP and user agent are recorded on audit rows.
 * @param options.sessionLike - When true, `tokenScopes` is null so procedures that refuse token
 *   mutations (`protectedProcedure`) run; the route must already have checked the `write` scope.
 */
export function createV1Caller(
  bearer: BearerContext,
  request: Request,
  options: { sessionLike?: boolean } = {},
): V1Caller {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const clientIp =
    forwarded ?? request.headers.get("x-real-ip")?.trim() ?? null;
  return createCaller({
    userId: bearer.userId,
    tokenScopes: options.sessionLike ? null : bearer.scopes,
    clientIp: clientIp && clientIp.length > 0 ? clientIp : null,
    userAgent: request.headers.get("user-agent")?.trim() ?? null,
    req: request,
    db,
  });
}

/**
 * Parses the request body as JSON.
 *
 * @throws {MalformedJsonError} when the body is empty or not valid JSON.
 */
export async function readJsonBody(request: Request): Promise<JsonValue> {
  const text = await request.text();
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    throw new MalformedJsonError();
  }
}

/**
 * Narrows a parsed body to a JSON object.
 *
 * @throws {V1HttpError} 422 when the body is an array, scalar, or null.
 */
export function requireJsonObject(body: JsonValue): {
  [key: string]: JsonValue;
} {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new V1HttpError(
      422,
      "UNPROCESSABLE_ENTITY",
      "Request body must be a JSON object.",
    );
  }
  return body;
}

function statusForTrpcCode(code: TRPCError["code"]): {
  status: number;
  code: V1ErrorCode;
} {
  switch (code) {
    case "UNAUTHORIZED":
      return { status: 401, code: "UNAUTHORIZED" };
    case "FORBIDDEN":
      return { status: 403, code: "FORBIDDEN" };
    case "NOT_FOUND":
      return { status: 404, code: "NOT_FOUND" };
    case "CONFLICT":
      return { status: 409, code: "CONFLICT" };
    case "BAD_REQUEST":
    case "UNPROCESSABLE_CONTENT":
      return { status: 422, code: "UNPROCESSABLE_ENTITY" };
    default:
      return { status: 500, code: "INTERNAL_SERVER_ERROR" };
  }
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

function appCodeOf(cause: Error | undefined): string | undefined {
  if (cause && "appCode" in cause && typeof cause.appCode === "string") {
    return cause.appCode;
  }
  return undefined;
}

/**
 * Converts a thrown failure to the error envelope response.
 *
 * TRPCError maps UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, CONFLICT 409, BAD_REQUEST 422
 * (Zod input failures list `path: message` pairs). Malformed JSON is 400. Unrecognized failures
 * are 500 with a generic message so internals do not leak.
 */
function v1ErrorFromThrown(error: Error): NextResponse {
  if (error instanceof V1HttpError) {
    return v1ErrorResponse(error.status, error.code, error.message);
  }
  if (error instanceof MalformedJsonError) {
    return v1ErrorResponse(400, "BAD_REQUEST", error.message);
  }
  if (error instanceof ZodError) {
    return v1ErrorResponse(
      422,
      "UNPROCESSABLE_ENTITY",
      describeZodError(error),
    );
  }
  if (error instanceof TRPCError) {
    const mapped = statusForTrpcCode(error.code);
    if (mapped.status === 500) {
      console.error("[api/v1] unexpected tRPC error:", error);
      return v1ErrorResponse(500, mapped.code, "Internal server error.");
    }
    const message =
      error.cause instanceof ZodError
        ? describeZodError(error.cause)
        : error.message;
    return v1ErrorResponse(
      mapped.status,
      mapped.code,
      message,
      appCodeOf(error.cause),
    );
  }
  console.error("[api/v1] unexpected error:", error);
  return v1ErrorResponse(
    500,
    "INTERNAL_SERVER_ERROR",
    "Internal server error.",
  );
}

/**
 * Runs a route body and converts any thrown failure to the error envelope.
 *
 * @param run - Route logic returning the success response.
 */
export async function handleV1(
  run: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await run();
  } catch (error) {
    return v1ErrorFromThrown(error as Error);
  }
}
