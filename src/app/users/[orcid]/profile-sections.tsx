"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Accordion,
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  ListBox,
  Tooltip,
} from "@heroui/react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  ExternalLink,
  Key,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { GitHubIcon, ORCIDIcon } from "@/components/icons";
import { CustomAvatar } from "@/components/ui/avatar";
import { SimpleDialog } from "@/components/ui/dialog";
import { PopoverMenu, PopoverMenuContent } from "@/components/ui/popover-menu";
import { cn } from "@heroui/styles";
import {
  MoleculeDisplayCompact,
  type DisplayMolecule,
} from "@/components/molecules/molecule-display";
import { MoleculeCardSkeleton } from "@/components/feedback/loading-state";
import { NexafsExperimentCompactCard } from "@/components/nexafs/nexafs-display";
import { mapNexafsBrowseGroupToCard } from "@/components/browse/nexafs-browse-map-group";
import { trpc } from "~/trpc/client";
import { moleculeContributorUsers } from "~/lib/molecule-contributor-users";
import { ToastContainer, useToast } from "@/components/ui/toast";

type ProfileUser = {
  id: string;
  name: string | null;
  image: string | null;
  roles: Array<{ slug: string; displayName: string; color: string }>;
};

type GitHubLinkedAccount = {
  id: string;
  provider: string;
  providerAccountId: string;
  login?: string | null;
  profileUrl?: string | null;
  avatarUrl?: string | null;
};

export type ProfileGitHubPresentation = {
  login: string | null;
  profileUrl: string | null;
};

const GITHUB_LINK_URL = "/api/auth/link-account?provider=github";

const githubIconBadgeClassName =
  "border-border bg-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error && error.message
    ? error.message
    : fallbackMessage;
}

function formatPasskeyLastUsed(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function passkeyDeviceLabel(passkey: {
  nickname: string | null;
  deviceType: string;
}): string {
  if (passkey.nickname?.trim()) return passkey.nickname.trim();
  if (passkey.deviceType === "multiDevice") {
    return "Cross-platform security key";
  }
  return "This device";
}

export function ProfileHeader({
  user,
  githubBadge,
}: {
  user: ProfileUser;
  githubBadge?: ReactNode;
}) {
  return (
    <header className="border-border bg-surface flex flex-col gap-6 rounded-2xl border p-6 sm:flex-row sm:items-start sm:p-8">
      <CustomAvatar user={user} size="lg" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h1 className="text-foreground mb-2 text-3xl font-bold tracking-tight">
          {user.name ?? "Researcher"}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <a
            href={`https://orcid.org/${user.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent inline-flex items-center gap-2 text-sm transition-colors"
            aria-label={`View ORCID record ${user.id}`}
          >
            <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
            <span className="tabular-nums">{user.id}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </a>
        </div>
        {githubBadge || user.roles.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {githubBadge}
            {user.roles.map((role) => (
              <Chip
                key={role.slug}
                size="sm"
                variant="soft"
                className="border border-transparent"
                style={
                  {
                    "--chip-soft-bg": `${role.color}22`,
                    borderColor: `${role.color}44`,
                  } as React.CSSProperties
                }
              >
                <Chip.Label className="font-medium" style={{ color: role.color }}>
                  {role.displayName}
                </Chip.Label>
              </Chip>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}

type ProfileContributionYearPoint = { year: number; count: number };

function ProfileContributionStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card className="border-border bg-surface border">
      <Card.Content className="px-4 py-3">
        <p className="text-muted text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
      </Card.Content>
    </Card>
  );
}

function ProfileContributionYearChart({
  title,
  description,
  data,
  emptyMessage,
}: {
  title: string;
  description: string;
  data: ProfileContributionYearPoint[];
  emptyMessage: string;
}) {
  const maxCount = Math.max(1, ...data.map((point) => point.count));
  const chartSummary =
    data.length > 0
      ? data.map((point) => `${point.year}: ${point.count}`).join(", ")
      : emptyMessage;

  return (
    <Card className="border-border bg-surface border">
      <Card.Header className="border-border border-b px-4 py-3">
        <Card.Title className="text-foreground text-sm font-semibold">
          {title}
        </Card.Title>
        <Card.Description className="text-muted text-xs">
          {description}
        </Card.Description>
      </Card.Header>
      <Card.Content className="px-4 py-4">
        {data.length === 0 ? (
          <p className="text-muted text-sm">{emptyMessage}</p>
        ) : (
          <div
            role="img"
            aria-label={`${title}. ${chartSummary}`}
            className="flex h-44 items-end gap-1 sm:gap-1.5"
          >
            {data.map((point) => {
              const heightPercent = Math.round((point.count / maxCount) * 100);
              return (
                <div
                  key={point.year}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                >
                  <span className="text-muted text-[10px] tabular-nums sm:text-xs">
                    {point.count > 0 ? point.count : ""}
                  </span>
                  <div
                    className="bg-default flex w-full max-w-8 items-end justify-center rounded-t-sm sm:max-w-10"
                    style={{ height: "7.5rem" }}
                  >
                    <div
                      className="w-full max-w-6 rounded-t-sm sm:max-w-8"
                      style={{
                        height: `${Math.max(point.count > 0 ? 8 : 0, heightPercent)}%`,
                        backgroundColor: "var(--accent)",
                      }}
                      title={`${point.year}: ${point.count}`}
                    />
                  </div>
                  <span className="text-muted text-[10px] tabular-nums sm:text-xs">
                    {point.year}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

export function ProfileOverviewSection({ userId }: { userId: string }) {
  const { data: stats, isLoading, isError } =
    trpc.users.getProfileContributionStats.useQuery({ userId });

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <section aria-labelledby="contribution-stats-heading">
        <div className="mb-4">
          <h2
            id="contribution-stats-heading"
            className="text-foreground text-xl font-semibold"
          >
            Contribution activity
          </h2>
          <p className="text-muted mt-1 text-sm">
            Molecules and NEXAFS datasets linked to this profile, by year of
            record creation.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Card
                key={index}
                className="border-border bg-surface border"
              >
                <Card.Content className="px-4 py-3">
                  <div className="bg-default h-3 w-24 animate-pulse rounded" />
                  <div className="bg-default mt-3 h-8 w-16 animate-pulse rounded" />
                </Card.Content>
              </Card>
            ))}
          </div>
        ) : isError || !stats ? (
          <Card className="border-border bg-surface border border-dashed">
            <Card.Content className="p-5">
              <p className="text-muted text-sm">
                Contribution statistics could not be loaded.
              </p>
            </Card.Content>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
            <ProfileContributionStatCard
              label="Molecules"
              value={stats.totals.molecules}
            />
            <ProfileContributionStatCard
              label="NEXAFS datasets"
              value={stats.totals.spectra}
            />
            <ProfileContributionStatCard
              label={`Molecules in ${currentYear}`}
              value={stats.totals.moleculesThisYear}
            />
            <ProfileContributionStatCard
              label={`Datasets in ${currentYear}`}
              value={stats.totals.spectraThisYear}
            />
          </div>
        )}
      </section>

      {!isLoading && stats ? (
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <ProfileContributionYearChart
            title="Molecules per year"
            description="Distinct molecules created or contributed to."
            data={stats.moleculesByYear}
            emptyMessage="No molecules linked to this profile yet."
          />
          <ProfileContributionYearChart
            title="NEXAFS datasets per year"
            description="Experiments uploaded or collected on."
            data={stats.spectraByYear}
            emptyMessage="No NEXAFS datasets linked to this profile yet."
          />
        </div>
      ) : null}
    </div>
  );
}

function profileGitHubProfileUrl(
  github: ProfileGitHubPresentation,
): string | null {
  if (github.profileUrl) {
    return github.profileUrl;
  }
  if (github.login) {
    return `https://github.com/${github.login}`;
  }
  return null;
}

export function ProfileGitHubHeaderBadge({
  github,
  isOwnProfile,
}: {
  github: ProfileGitHubPresentation | null | undefined;
  isOwnProfile: boolean;
}) {
  if (github === undefined) {
    return null;
  }

  const profileUrl = github ? profileGitHubProfileUrl(github) : null;
  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          githubIconBadgeClassName,
          "text-foreground hover:bg-default hover:border-accent/40",
        )}
        aria-label={
          github?.login
            ? `View GitHub profile ${github.login}`
            : "View GitHub profile"
        }
      >
        <GitHubIcon className="h-5 w-5 shrink-0" />
      </a>
    );
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <PopoverMenu
      align="start"
      contentClassName="w-[min(100vw-2rem,280px)]"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          {...triggerProps}
          type="button"
          aria-label={
            isOpen ? "Close GitHub connection help" : "Link GitHub account"
          }
          className={cn(
            githubIconBadgeClassName,
            "text-muted cursor-pointer opacity-50 hover:opacity-80",
          )}
        >
          <GitHubIcon className="h-5 w-5 shrink-0" />
        </button>
      )}
      renderContent={({ contentPositionClassName, contentProps, close }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(
            contentPositionClassName,
            "border-border bg-surface w-[min(100vw-2rem,280px)] rounded-xl border p-4 shadow-lg",
          )}
        >
          <p className="text-foreground text-sm font-medium">Link GitHub</p>
          <p className="text-muted mt-1 text-sm">
            Connect GitHub for optional sign-in after you have signed in with
            ORCID.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            onPress={() => {
              close();
              window.location.href = GITHUB_LINK_URL;
            }}
          >
            <GitHubIcon className="h-4 w-4 shrink-0" />
            Link GitHub
          </Button>
        </PopoverMenuContent>
      )}
    />
  );
}

export function ProfileGitHubSecuritySection({
  linkedAccounts,
  isUnlinking,
  onUnlink,
}: {
  linkedAccounts: GitHubLinkedAccount[] | undefined;
  isUnlinking: boolean;
  onUnlink: (accountId: string) => Promise<void>;
}) {
  const githubAccount = linkedAccounts?.find((acc) => acc.provider === "github");
  const login =
    githubAccount?.login ??
    (githubAccount
      ? `user-${githubAccount.providerAccountId.slice(0, 6)}`
      : null);

  return (
    <section
      aria-labelledby="github-connection-heading"
      className="border-border space-y-3 border-t pt-6"
    >
      <div>
        <h3
          id="github-connection-heading"
          className="text-foreground text-base font-semibold"
        >
          GitHub
        </h3>
        <p className="text-muted mt-1 text-sm">
          Optional secondary sign-in after ORCID.
        </p>
      </div>
      {githubAccount ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-sm">
            Connected
            {login ? (
              <>
                {" "}
                as{" "}
                <span className="text-foreground font-medium">{login}</span>
              </>
            ) : null}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => void onUnlink(githubAccount.id)}
            isPending={isUnlinking}
          >
            Unlink GitHub
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            window.location.href = GITHUB_LINK_URL;
          }}
        >
          <GitHubIcon className="h-4 w-4 shrink-0" />
          Link GitHub
        </Button>
      )}
    </section>
  );
}

export function ProfileApiKeysSection() {
  return (
    <section aria-labelledby="api-keys-heading" className="space-y-3">
      <div>
        <h2
          id="api-keys-heading"
          className="text-foreground text-lg font-semibold"
        >
          API keys
        </h2>
        <p className="text-muted mt-1 text-sm">
          Programmatic access for scripts and integrations.
        </p>
      </div>
      <Card className="border-border bg-surface pointer-events-none border border-dashed opacity-60">
        <Card.Content className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Chip size="sm" variant="soft">
              <Chip.Label>Coming soon</Chip.Label>
            </Chip>
            <p className="text-muted text-sm">
              Mint API keys for programmatic access to X-ray Atlas.
            </p>
          </div>
          <ul className="space-y-2" aria-hidden>
            <li className="border-border bg-default/50 h-10 rounded-lg border" />
            <li className="border-border bg-default/30 h-10 rounded-lg border" />
          </ul>
          <Button size="sm" variant="secondary" isDisabled>
            Create API key
          </Button>
        </Card.Content>
      </Card>
    </section>
  );
}

export function ProfilePasskeysSection({
  passkeys,
  passkeyEnrollment,
  passkeyRequiredRedirect,
  isRegistering,
  isDeleting,
  onRegister,
  onDelete,
}: {
  passkeys:
    | Array<{
        id: string;
        nickname: string | null;
        deviceType: string;
        backedUp: boolean;
        transports: string[];
        lastUsedAt: Date | string | null;
      }>
    | undefined;
  passkeyEnrollment:
    | {
        enrolled: boolean;
        requiresAal3Hardware: boolean;
        hasAal3EligiblePasskey: boolean;
      }
    | undefined;
  passkeyRequiredRedirect: boolean;
  isRegistering: boolean;
  isDeleting: boolean;
  onRegister: () => Promise<void>;
  onDelete: (passkeyId: string) => Promise<void>;
}) {
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const showContributionHint =
    passkeyRequiredRedirect || passkeyEnrollment?.enrolled === false;

  const showAal3Callout =
    passkeyEnrollment?.requiresAal3Hardware &&
    passkeyEnrollment.enrolled &&
    !passkeyEnrollment.hasAal3EligiblePasskey;

  return (
    <section aria-labelledby="passkeys-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id="passkeys-heading"
            className="text-foreground text-lg font-semibold"
          >
            Passkeys
          </h2>
          <p className="text-muted mt-1 text-sm">
            Passwordless sign-in and step-up access for contributions.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onPress={() => void onRegister()}
          isPending={isRegistering}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add passkey
        </Button>
      </div>

      {showContributionHint ? (
        <Alert status="accent">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Unlock data contribution</Alert.Title>
            <Alert.Description>
              Register a passkey to submit molecules and NEXAFS datasets. Browse
              stays available with ORCID sign-in.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {showAal3Callout ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Hardware key for admin and Labs</Alert.Title>
            <Alert.Description>
              Your role requires a cross-platform FIDO2 security key (for example
              YubiKey) in addition to platform passkeys such as Touch ID.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {passkeys && passkeys.length > 0 ? (
        <ul className="space-y-2">
          {passkeys.map((passkey) => {
            const lastUsed = formatPasskeyLastUsed(passkey.lastUsedAt);
            return (
              <li key={passkey.id}>
                <Card className="border-border bg-surface border">
                  <Card.Content className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                        <Key className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium">
                          {passkeyDeviceLabel(passkey)}
                        </p>
                        <p className="text-muted mt-1 text-xs">
                          {lastUsed ? `Last used ${lastUsed}` : "Not used yet"}
                          {passkey.backedUp ? " · Synced / backed up" : " · Device-bound"}
                          {passkey.transports.length > 0
                            ? ` · ${passkey.transports.join(", ")}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() => setRevokeTargetId(passkey.id)}
                      isDisabled={isDeleting}
                    >
                      Revoke
                    </Button>
                  </Card.Content>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="border-border bg-surface border border-dashed">
          <Card.Content className="p-5 text-center sm:text-left">
            <p className="text-foreground text-sm font-medium">
              No passkeys yet
            </p>
            <p className="text-muted mt-1 text-sm">
              Add a passkey for faster sign-in and to contribute spectroscopy
              data.
            </p>
          </Card.Content>
        </Card>
      )}

      <SimpleDialog
        isOpen={revokeTargetId !== null}
        onClose={() => setRevokeTargetId(null)}
        title="Revoke this passkey?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            You will not be able to sign in with this passkey after revocation.
            Keep at least one sign-in method (ORCID or another passkey).
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={() => setRevokeTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isPending={isDeleting}
              onPress={() => {
                if (!revokeTargetId) return;
                void onDelete(revokeTargetId).finally(() => {
                  setRevokeTargetId(null);
                });
              }}
            >
              Revoke passkey
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </section>
  );
}

function ContributionRoleChips({
  contributions,
}: {
  contributions: Array<"creator" | "contributor">;
}) {
  const unique = [...new Set(contributions)];
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {unique.includes("creator") ? (
        <Chip size="sm" variant="soft" color="accent">
          <Chip.Label>Creator</Chip.Label>
        </Chip>
      ) : null}
      {unique.includes("contributor") ? (
        <Chip size="sm" variant="soft">
          <Chip.Label>Contributor</Chip.Label>
        </Chip>
      ) : null}
    </div>
  );
}

function ProfileContributionsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <MoleculeCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ProfileContributionsSection({
  userId,
  isOwnProfile,
}: {
  userId: string;
  isOwnProfile: boolean;
}) {
  const { data: moleculesData, isLoading: moleculesLoading } =
    trpc.users.listProfileMolecules.useQuery({
      userId,
      limit: 12,
    });

  const { data: experimentsData, isLoading: experimentsLoading } =
    trpc.users.listProfileExperiments.useQuery({
      userId,
      limit: 12,
    });

  const molecules = moleculesData?.items ?? [];
  const experimentGroups = experimentsData?.groups ?? [];

  return (
    <div className="space-y-10">
      <section aria-labelledby="profile-molecules-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="profile-molecules-heading"
              className="text-foreground text-xl font-semibold"
            >
              Molecules you contributed
            </h2>
            <p className="text-muted mt-1 text-sm">
              Molecules you created or appear on as a contributor.
            </p>
          </div>
          <Link
            href={`/browse/molecules?q=${encodeURIComponent(userId)}`}
            className="text-accent text-sm font-medium hover:underline"
          >
            Browse all molecules
          </Link>
        </div>

        {moleculesLoading ? (
          <ProfileContributionsSkeleton />
        ) : molecules.length === 0 ? (
          <Card className="border-border bg-surface border border-dashed">
            <Card.Content className="p-6">
              <p className="text-muted text-sm">
                No molecules linked to this profile yet.
              </p>
            </Card.Content>
          </Card>
        ) : (
          <ul className="space-y-3">
            {molecules.map(({ molecule, contributions }) => (
              <li key={molecule.id}>
                <ContributionRoleChips contributions={contributions} />
                <MoleculeDisplayCompact
                  molecule={molecule}
                  enableRealtime={false}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="profile-nexafs-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              id="profile-nexafs-heading"
              className="text-foreground text-xl font-semibold"
            >
              Experimental data (NEXAFS)
            </h2>
            <p className="text-muted mt-1 text-sm">
              Datasets you uploaded or are listed as a collector on.
            </p>
          </div>
          <Link
            href="/browse/nexafs"
            className="text-accent text-sm font-medium hover:underline"
          >
            Browse NEXAFS catalog
          </Link>
        </div>

        {experimentsLoading ? (
          <ProfileContributionsSkeleton rows={2} />
        ) : experimentGroups.length === 0 ? (
          <Card className="border-border bg-surface border border-dashed">
            <Card.Content className="p-6">
              <p className="text-muted text-sm">
                No NEXAFS experiments linked to this profile yet.
              </p>
            </Card.Content>
          </Card>
        ) : (
          <ul className="space-y-3">
            {experimentGroups.map((group) => {
              const { key, props } = mapNexafsBrowseGroupToCard(group);
              return (
                <li key={key}>
                  <NexafsExperimentCompactCard {...props} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isOwnProfile ? (
        <section aria-labelledby="owned-molecules-heading">
          <div className="border-border mb-4 border-t pt-8">
            <h2
              id="owned-molecules-heading"
              className="text-foreground flex items-center gap-2 text-xl font-semibold"
            >
              <Shield className="h-5 w-5 text-muted" aria-hidden />
              Molecules you own
            </h2>
            <p className="text-muted mt-1 text-sm">
              Transfer or permanently delete molecules you created.
            </p>
          </div>
          <OwnedMoleculesManager userId={userId} />
        </section>
      ) : null}
    </div>
  );
}

function OwnedMoleculesManager({ userId }: { userId: string }) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();
  const transferOwnership = trpc.molecules.transferOwnership.useMutation();
  const removeMolecule = trpc.molecules.remove.useMutation();
  const getDeleteDataPointImpact =
    trpc.molecules.getDeleteDataPointImpact.useMutation();
  const { data, isLoading } = trpc.molecules.getByCreator.useInfiniteQuery(
    {
      creatorId: userId,
      limit: 12,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const molecules = data?.pages.flatMap((page) => page.molecules) ?? [];
  const { data: coreMaintainers } = trpc.users.getCoreMaintainers.useQuery(
    undefined,
    { enabled: session?.user?.id === userId },
  );

  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [deleteDialogMoleculeId, setDeleteDialogMoleculeId] = useState<
    string | null
  >(null);
  const [deleteDataPointsRemoved, setDeleteDataPointsRemoved] = useState<
    number | null
  >(null);
  const deleteImpactRequestIdRef = useRef<string | null>(null);
  const [transferDialogMoleculeId, setTransferDialogMoleculeId] = useState<
    string | null
  >(null);
  const [transferRecipientUserId, setTransferRecipientUserId] = useState<
    string | null
  >(null);

  const pendingDeleteMolecule =
    deleteDialogMoleculeId !== null
      ? (molecules.find((m) => m.id === deleteDialogMoleculeId) ?? null)
      : null;

  const pendingTransferMolecule =
    transferDialogMoleculeId !== null
      ? (molecules.find((m) => m.id === transferDialogMoleculeId) ?? null)
      : null;

  const openDelete = (moleculeId: string) => {
    deleteImpactRequestIdRef.current = moleculeId;
    setDeleteDataPointsRemoved(null);
    setDeleteDialogMoleculeId(moleculeId);
    void getDeleteDataPointImpact
      .mutateAsync({ moleculeId })
      .then((res) => {
        if (deleteImpactRequestIdRef.current === moleculeId) {
          setDeleteDataPointsRemoved(res.dataPointsRemoved);
        }
      })
      .catch((error) => {
        showToast(
          getErrorMessage(error, "Failed to calculate delete impact"),
          "error",
          0,
        );
        if (deleteImpactRequestIdRef.current === moleculeId) {
          setDeleteDataPointsRemoved(-1);
        }
      });
  };

  const closeDelete = () => {
    setDeleteDialogMoleculeId(null);
    setDeleteDataPointsRemoved(null);
  };

  const openTransfer = (moleculeId: string) => {
    setTransferDialogMoleculeId(moleculeId);
    setTransferRecipientUserId(null);
  };

  const closeTransfer = () => {
    setTransferDialogMoleculeId(null);
    setTransferRecipientUserId(null);
  };

  if (isLoading) {
    return <ProfileContributionsSkeleton rows={2} />;
  }

  if (molecules.length === 0) {
    return (
      <Card className="border-border bg-surface border border-dashed">
        <Card.Content className="p-6">
          <p className="text-muted text-sm">
            You have not created any molecules yet.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialogMoleculeId) return;
    try {
      await removeMolecule.mutateAsync({ moleculeId: deleteDialogMoleculeId });
      await Promise.all([
        utils.molecules.getByCreator.invalidate({ creatorId: userId, limit: 12 }),
        utils.users.listProfileMolecules.invalidate({ userId, limit: 12 }),
      ]);
      closeDelete();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Failed to remove molecule from database"),
        "error",
        0,
      );
    }
  };

  const handleTransferConfirm = async () => {
    if (!transferDialogMoleculeId || !transferRecipientUserId) return;
    try {
      await transferOwnership.mutateAsync({
        moleculeId: transferDialogMoleculeId,
        newCreatorId: transferRecipientUserId,
      });
      await Promise.all([
        utils.molecules.getByCreator.invalidate({ creatorId: userId, limit: 12 }),
        utils.users.listProfileMolecules.invalidate({ userId, limit: 12 }),
      ]);
      closeTransfer();
    } catch (error) {
      showToast(
        getErrorMessage(error, "Failed to transfer molecule ownership"),
        "error",
        0,
      );
    }
  };

  const recipientOptions = (() => {
    if (!pendingTransferMolecule) return [];
    const contributors = moleculeContributorUsers(
      pendingTransferMolecule.contributors,
    );
    const core = coreMaintainers ?? [];

    const byId = new Map<
      string,
      {
        id: string;
        name: string | null;
        image: string | null;
        kind: "core" | "contributor";
      }
    >();

    for (const u of core) {
      byId.set(u.id, {
        id: u.id,
        name: u.name,
        image: u.image,
        kind: "core",
      });
    }

    for (const u of contributors) {
      if (!byId.has(u.id)) {
        byId.set(u.id, {
          id: u.id,
          name: u.name,
          image: u.image,
          kind: "contributor",
        });
      }
    }

    return Array.from(byId.values());
  })();

  const recipientAvatar = (user: {
    name: string | null;
    image: string | null;
  }) => {
    const initials =
      user.name
        ?.split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase() ?? "U";

    const fallback = initials.length > 2 ? initials.slice(0, 2) : initials;

    return (
      <Avatar size="sm" className="shrink-0">
        {user.image ? (
          <Avatar.Image
            alt={user.name ?? "User"}
            src={user.image}
            className="rounded-full"
          />
        ) : null}
        <Avatar.Fallback className="text-xs">{fallback}</Avatar.Fallback>
      </Avatar>
    );
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Accordion
        variant="surface"
        className="border-border w-full rounded-lg border"
        aria-label="Danger zone"
      >
        <Accordion.Item key="danger-zone" id="danger-zone">
          <Accordion.Heading>
            <Accordion.Trigger
              onPress={() => setIsDangerZoneOpen((v) => !v)}
              className="flex w-full items-center gap-2 px-4 py-3 text-left"
            >
              <AlertTriangle className="text-danger h-4 w-4 shrink-0" />
              <span className="text-foreground text-sm font-semibold">
                Danger zone
              </span>
              <span className="text-muted text-xs">
                Delete or transfer ownership
              </span>
              <Accordion.Indicator className="text-muted ml-auto shrink-0 [&>svg]:size-4">
                <ChevronDown className="h-4 w-4" />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="text-muted px-4 pt-0 pb-4 text-sm">
              Deleting removes the molecule and all related records. Transferring
              keeps the molecule and changes the owner.
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <div className="w-full space-y-3">
        {molecules.map((molecule) => (
          <div
            key={molecule.id}
            className="flex items-stretch gap-3 [&>div]:[contain-intrinsic-size:0_120px]"
          >
            {isDangerZoneOpen ? (
              <div className="self-stretch">
                <div className="border-border bg-surface flex h-full w-11 flex-col overflow-hidden rounded-lg border">
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <span className="inline-flex h-11 w-11 flex-none">
                        <Button
                          isIconOnly
                          aria-label={`Delete molecule ${molecule.name}`}
                          onPress={() => openDelete(molecule.id)}
                          size="sm"
                          variant="danger"
                          className="h-11 w-11 rounded-none rounded-t-lg"
                          isDisabled={
                            removeMolecule.isPending &&
                            deleteDialogMoleculeId === molecule.id
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="right top">
                      Delete {molecule.name}
                    </Tooltip.Content>
                  </Tooltip>
                  <div className="border-border h-px w-full border-t" />
                  <Tooltip delay={0}>
                    <Tooltip.Trigger>
                      <span className="inline-flex h-11 w-11 flex-none">
                        <Button
                          isIconOnly
                          aria-label={`Transfer ownership of ${molecule.name}`}
                          onPress={() => openTransfer(molecule.id)}
                          size="sm"
                          variant="ghost"
                          className="text-warning h-11 w-11 rounded-none rounded-b-lg"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </Button>
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content placement="right top">
                      Transfer {molecule.name}
                    </Tooltip.Content>
                  </Tooltip>
                </div>
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              <MoleculeDisplayCompact
                molecule={molecule as DisplayMolecule}
                enableRealtime={false}
              />
            </div>
          </div>
        ))}
      </div>

      <SimpleDialog
        isOpen={deleteDialogMoleculeId !== null}
        onClose={closeDelete}
        title="Delete molecule permanently?"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <Alert status="warning">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Permanent deletion</Alert.Title>
              <Alert.Description>
                You are about to delete{" "}
                <span className="text-foreground font-semibold">
                  {pendingDeleteMolecule?.name ?? "this molecule"}
                </span>
                . This removes{" "}
                <span className="tabular-nums font-semibold">
                  {deleteDataPointsRemoved === null
                    ? "…"
                    : deleteDataPointsRemoved < 0
                      ? "unknown"
                      : deleteDataPointsRemoved.toLocaleString()}
                </span>{" "}
                data points and cannot be undone.
              </Alert.Description>
            </Alert.Content>
          </Alert>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={closeDelete}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              onPress={() => {
                const id = deleteDialogMoleculeId;
                closeDelete();
                if (id) openTransfer(id);
              }}
            >
              Transfer instead
            </Button>
            <Button
              variant="danger"
              onPress={() => void handleDeleteConfirm()}
              isPending={removeMolecule.isPending}
            >
              Delete molecule
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={transferDialogMoleculeId !== null}
        onClose={closeTransfer}
        title="Transfer molecule ownership"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Transfer{" "}
            <span className="text-foreground font-semibold">
              {pendingTransferMolecule?.name ?? "this molecule"}
            </span>
            . The record is kept; only ownership changes.
          </p>
          <ListBox
            aria-label="Choose new owner"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={
              transferRecipientUserId
                ? new Set([transferRecipientUserId])
                : new Set()
            }
            onSelectionChange={(keys) => {
              const first = Array.from(keys)[0];
              setTransferRecipientUserId(first ? String(first) : null);
            }}
          >
            {recipientOptions.length === 0 ? (
              <ListBox.Item key="none" textValue="No recipients available">
                <span className="text-muted text-sm">No recipients available</span>
              </ListBox.Item>
            ) : (
              recipientOptions.map((u) => (
                <ListBox.Item key={u.id} textValue={u.name ?? u.id}>
                  <div className="flex items-center gap-3">
                    {recipientAvatar({ name: u.name, image: u.image })}
                    <div className="min-w-0">
                      <div className="text-foreground truncate text-sm font-medium">
                        {u.name ?? "User"}
                      </div>
                      <div className="text-muted truncate text-xs">
                        {u.kind === "core" ? "Core maintainer" : "Contributor"}
                      </div>
                    </div>
                  </div>
                </ListBox.Item>
              ))
            )}
          </ListBox>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onPress={closeTransfer}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => void handleTransferConfirm()}
              isDisabled={
                !transferRecipientUserId || recipientOptions.length === 0
              }
              isPending={transferOwnership.isPending}
            >
              Transfer ownership
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}

export function ProfileSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border bg-surface border">
      <Card.Header className="border-border border-b px-5 py-4">
        <Card.Title className="text-foreground text-base font-semibold">
          {title}
        </Card.Title>
        {description ? (
          <Card.Description className="text-muted text-sm">
            {description}
          </Card.Description>
        ) : null}
      </Card.Header>
      <Card.Content className="space-y-6 p-5">{children}</Card.Content>
    </Card>
  );
}
