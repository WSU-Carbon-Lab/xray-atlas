import { NextResponse } from "next/server";

/**
 * Preserves legacy molecule redirect-search behavior for `/api/v1` callers by forwarding
 * query params to the existing `/api/molecules/search` route.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const targetUrl = new URL("/api/molecules/search", requestUrl.origin);

  for (const [key, value] of requestUrl.searchParams.entries()) {
    targetUrl.searchParams.append(key, value);
  }

  return NextResponse.redirect(targetUrl, { status: 307 });
}
