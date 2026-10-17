import { auth } from "~/server/auth";
import { NextResponse, type NextRequest } from "next/server";
import {
  decodePendingAttributionReviewCookieValue,
  PENDING_ATTRIBUTION_RETURN_TO_COOKIE,
  PENDING_ATTRIBUTION_REVIEW_COOKIE,
  PENDING_ATTRIBUTIONS_PATH,
  pendingAttributionWelcomePath,
  sanitizePendingAttributionReturnTo,
} from "~/server/auth/pending-attribution-review-bridge";

const reviewCookieClear = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
  secure: process.env.NODE_ENV === "production",
};

const reviewCookieWrite = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 10,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Next.js proxy. Public HTML skips the database session lookup.
 * Contribute gates and the first-login attribution review cookie still resolve the session.
 */
function requestNeedsProxySession(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/contribute")) {
    return true;
  }
  return Boolean(request.cookies.get(PENDING_ATTRIBUTION_REVIEW_COOKIE)?.value);
}

const sessionProxy = auth((req) => {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isAuthenticated = !!req.auth;

  if (!isAuthenticated && pathname.startsWith("/contribute")) {
    return NextResponse.redirect(
      new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, req.url),
    );
  }

  if (isAuthenticated && !pathname.startsWith("/sign-in")) {
    const rawReview = req.cookies.get(PENDING_ATTRIBUTION_REVIEW_COOKIE)?.value;
    if (rawReview) {
      const onPendingPage = pathname.startsWith(PENDING_ATTRIBUTIONS_PATH);
      const review = decodePendingAttributionReviewCookieValue(rawReview);
      const sessionOrcid = req.auth?.user?.id;

      // Already on the validation page, invalid/stale payload, or cookie ORCID
      // does not match this session: drop the cookie so leaving cannot re-divert.
      if (
        onPendingPage ||
        !review ||
        !sessionOrcid ||
        review.orcid !== sessionOrcid
      ) {
        const cleared = NextResponse.next();
        cleared.cookies.set(
          PENDING_ATTRIBUTION_REVIEW_COOKIE,
          "",
          reviewCookieClear,
        );
        return cleared;
      }

      const returnTo = sanitizePendingAttributionReturnTo(
        pathname + req.nextUrl.search + req.nextUrl.hash,
        req.nextUrl.origin,
      );
      const target = new URL(pendingAttributionWelcomePath(), req.url);
      const response = NextResponse.redirect(target);
      response.cookies.set(
        PENDING_ATTRIBUTION_REVIEW_COOKIE,
        "",
        reviewCookieClear,
      );
      response.cookies.set(
        PENDING_ATTRIBUTION_RETURN_TO_COOKIE,
        returnTo,
        reviewCookieWrite,
      );
      return response;
    }
  }

  return NextResponse.next();
});

export default function proxy(
  ...args: Parameters<typeof sessionProxy>
): ReturnType<typeof sessionProxy> {
  const request = args[0];
  if (!requestNeedsProxySession(request)) {
    return NextResponse.next();
  }
  return sessionProxy(...args);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
