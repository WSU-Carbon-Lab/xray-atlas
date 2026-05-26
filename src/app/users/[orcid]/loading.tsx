import {
  ProfileContributionsSectionSkeleton,
  ProfileHeaderSkeleton,
  ProfileMainTabsSkeleton,
  ProfilePageShell,
} from "./profile-sections";

export default function UserProfileLoading() {
  return (
    <ProfilePageShell>
      <ProfileHeaderSkeleton />
      <ProfileMainTabsSkeleton />
      <ProfileContributionsSectionSkeleton />
    </ProfilePageShell>
  );
}
