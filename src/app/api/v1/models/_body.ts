/**
 * Request-body helpers of the `/api/v1/models` write routes.
 *
 * Reads a JSON object body, optionally allowing an empty body, and names the procedure input type
 * a route casts its body to. Performs no validation beyond "is a JSON object"; the tRPC procedure's
 * Zod input validates the fields.
 */

import {
  MalformedJsonError,
  readJsonBody,
  requireJsonObject,
  type JsonValue,
  type V1Caller,
} from "~/app/api/v1/_lib/write-api";

/** Input type of one `opticalModels` procedure. */
export type ModelInput<K extends keyof V1Caller["opticalModels"]> = Parameters<
  V1Caller["opticalModels"][K]
>[0];

/**
 * Parses the request body as a JSON object.
 *
 * @param request - Incoming request.
 * @param options.optional - When true, an empty body reads as `{}`.
 * @throws {MalformedJsonError} 400 when the body is not valid JSON.
 * @throws {V1HttpError} 422 when the body is valid JSON but not an object.
 */
export async function readObjectBody(
  request: Request,
  options: { optional?: boolean } = {},
): Promise<{ [key: string]: JsonValue }> {
  if (options.optional) {
    const text = await request.clone().text();
    if (text.trim() === "") return {};
  }
  try {
    return requireJsonObject(await readJsonBody(request));
  } catch (error) {
    if (error instanceof MalformedJsonError) throw error;
    throw error;
  }
}
