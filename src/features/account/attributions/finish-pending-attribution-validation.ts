"use server";

import {
  consumePendingAttributionReturnToCookie,
  sanitizePendingAttributionReturnTo,
} from "~/server/auth/pending-attribution-review-bridge";
import { getBaseUrl } from "~/utils/getBaseUrl";

/**
 * Clears the first-login return-to cookie and resolves the path the client should
 * navigate to after finishing attribution validation.
 *
 * @param fallbackReturnTo - Optional relative path already peeked by the RSC page
 *   when the cookie is still present; used when consume races or the cookie expired.
 * @returns Same-origin relative path; defaults to `/` when nothing safe remains.
 */
export async function finishPendingAttributionValidation(
  fallbackReturnTo?: string | null,
): Promise<string> {
  const fromCookie = await consumePendingAttributionReturnToCookie();
  const candidate = fromCookie ?? fallbackReturnTo ?? "/";
  return sanitizePendingAttributionReturnTo(candidate, getBaseUrl());
}
