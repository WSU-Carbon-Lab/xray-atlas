import { redirect } from "next/navigation";
import { PendingAttributionsPage } from "~/features/account/attributions/pending-attributions-page";
import {
  isPendingAttributionWelcomeSearchParams,
  peekPendingAttributionReturnToCookie,
  pendingAttributionWelcomePath,
  sanitizePendingAttributionReturnTo,
} from "~/server/auth/pending-attribution-review-bridge";
import { getBaseUrl } from "~/utils/getBaseUrl";

export const metadata = {
  title: "Dataset attributions",
  robots: {
    index: false,
    follow: false,
  },
};

interface AccountPendingAttributionsRouteProps {
  searchParams: Promise<{
    welcome?: string | string[];
    "welcome=1"?: string | string[];
  }>;
}

/**
 * Account route for pending dataset attribution review and first-login
 * validation. `?welcome=1` is set by the post-createUser proxy divert when
 * the new ORCID already had pending contributor rows; the originating callback
 * URL is restored from the return-to cookie after the user finishes.
 */
export default async function AccountPendingAttributionsRoute({
  searchParams,
}: AccountPendingAttributionsRouteProps) {
  const params = await searchParams;
  const isFirstLoginWelcome = isPendingAttributionWelcomeSearchParams(params);

  // Older Auth.js callback-url pollution produced `?welcome%3D1` (literal key).
  // Canonicalize so client/RSC share a single onboarding URL shape.
  if (
    isFirstLoginWelcome &&
    params.welcome !== "1" &&
    !(Array.isArray(params.welcome) && params.welcome[0] === "1")
  ) {
    redirect(pendingAttributionWelcomePath());
  }

  const returnToRaw = isFirstLoginWelcome
    ? await peekPendingAttributionReturnToCookie()
    : null;
  const returnTo = sanitizePendingAttributionReturnTo(
    returnToRaw ?? "/",
    getBaseUrl(),
  );

  return (
    <PendingAttributionsPage
      isFirstLoginWelcome={isFirstLoginWelcome}
      returnTo={returnTo}
    />
  );
}
