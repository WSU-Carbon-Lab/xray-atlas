/**
 * Resolves the viewer of an optical model request from a tRPC context.
 *
 * Owns the rule that a bearer token without the `read` scope reads as an anonymous caller.
 * Does not authenticate anything; the context already carries the resolved identity.
 */

import type { ModelViewer } from "~/server/optical-models/visibility";

/** The identity fields of a tRPC context that decide what a caller may read. */
export interface ViewerContext {
  userId: string | null;
  tokenScopes: readonly string[] | null;
}

/**
 * The viewer for a request.
 *
 * Cookie sessions (`tokenScopes` null) read as the signed-in user. A bearer token reads as its
 * user only when it holds `read`; otherwise the request reads as anonymous, so it sees public
 * models only.
 *
 * @param ctx - Identity fields of the tRPC context.
 * @returns The viewer to pass to visibility filters.
 */
export function modelViewerFromContext(ctx: ViewerContext): ModelViewer {
  if (ctx.tokenScopes !== null && !ctx.tokenScopes.includes("read")) {
    return { userId: null };
  }
  return { userId: ctx.userId };
}
