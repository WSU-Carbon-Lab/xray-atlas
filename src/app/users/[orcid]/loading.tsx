import {
  ProfileHeaderSkeleton,
  ProfileMainTabsSkeleton,
  ProfilePageShell,
} from "./profile-sections";
import { LoadingSkeleton } from "~/components/feedback/loading-state";

/**
 * Route-level loading shell for `/users/[orcid]`.
 * Keeps chrome compact so Preferences/Security soft navigations do not flash a
 * full Contributions grid skeleton.
 */
export default function UserProfileLoading() {
  return (
    <ProfilePageShell>
      <ProfileHeaderSkeleton />
      <ProfileMainTabsSkeleton />
      <div className="border-border bg-surface mt-6 rounded-xl border p-5">
        <LoadingSkeleton className="mb-3 h-5 w-40 max-w-full rounded" />
        <LoadingSkeleton className="h-4 w-full max-w-xl rounded" />
        <LoadingSkeleton className="mt-4 h-24 w-full rounded-lg" />
      </div>
    </ProfilePageShell>
  );
}
