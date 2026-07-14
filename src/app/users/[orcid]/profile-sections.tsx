"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Accordion,
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Chip,
  ListBox,
  Pagination,
  Tabs,
  Tooltip,
} from "@heroui/react";
import {
  BeakerIcon,
  BoltIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import {
  ExternalLink,
  Key,
  MoreVertical,
  Plus,
  UserMinus,
} from "lucide-react";
import { AccentNavChip } from "@/components/ui/accent-nav-chip";
import { GitHubIcon, ORCIDIcon } from "@/components/icons";
import { CustomAvatar } from "@/components/ui/avatar";
import { SimpleDialog } from "@/components/ui/dialog";
import { cn } from "@heroui/styles";
import {
  MoleculeDisplayCompact,
} from "@/components/molecules/molecule-display";
import {
  LoadingSkeleton,
  MoleculeCompactSkeleton,
  NexafsExperimentCompactSkeleton,
} from "@/components/feedback/loading-state";
import { NexafsExperimentCompactCard } from "@/components/nexafs/nexafs-display";
import { mapNexafsBrowseGroupToCard } from "@/components/browse/nexafs-browse-map-group";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import { trpc } from "~/trpc/client";
import { moleculeContributorUsers } from "~/lib/molecule-contributor-users";
import { moleculeContributionTypeLabel } from "~/lib/molecule-contribution-types";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { ProfileDangerZoneRail } from "@/components/profile/profile-danger-zone-rail";
import {
  getSessionAalRequiredAppCode,
  type SessionWriteAssuranceAppCode,
} from "~/lib/passkey-client-auth";
import type { SessionWriteAssuranceEvaluation } from "~/server/auth/mfa-access";
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

const profileIdentityRowClassName =
  "inline-flex min-h-10 items-center gap-2 text-sm transition-colors";

function handlePrivilegedWriteError(
  error: unknown,
  showToast: (message: string, type: "error" | "success", duration?: number) => void,
  onSessionAalRequired: (() => void) | undefined,
  fallbackMessage: string,
): void {
  if (getSessionAalRequiredAppCode(error) && onSessionAalRequired) {
    onSessionAalRequired();
    return;
  }
  showToast(getErrorMessage(error, fallbackMessage), "error", 0);
}

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
  github,
  isOwnProfile = false,
  initialContributionStats,
}: {
  user: ProfileUser;
  github?: ProfileGitHubPresentation | null;
  isOwnProfile?: boolean;
  initialContributionStats?: ProfileContributionStats;
}) {
  const {
    data: contributionStats,
    isLoading: contributionStatsLoading,
    isError: contributionStatsError,
  } = trpc.users.getProfileContributionStats.useQuery(
    { userId: user.id },
    { initialData: initialContributionStats },
  );

  return (
    <header className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-4 sm:gap-5 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
          <CustomAvatar
            user={user}
            size="lg"
            className="ring-border bg-surface h-[4.5rem] w-[4.5rem] shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background sm:h-20 sm:w-20"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-foreground mb-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {user.name ?? "Researcher"}
            </h1>
            <div className="flex flex-col gap-0.5">
              <a
                href={`https://orcid.org/${user.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  profileIdentityRowClassName,
                  "text-muted hover:text-accent min-h-8 py-0",
                )}
                aria-label={`View ORCID record ${user.id}`}
              >
                <ORCIDIcon className="h-5 w-5 shrink-0" authenticated />
                <span className="tabular-nums">{user.id}</span>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </a>
              <ProfileGitHubHeaderRow
                github={github}
                isOwnProfile={isOwnProfile}
              />
            </div>
            {user.roles.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
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
                    <Chip.Label
                      className="font-medium"
                      style={{ color: role.color }}
                    >
                      {role.displayName}
                    </Chip.Label>
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <ProfileContributionHeaderYearCharts
          stats={contributionStats}
          isLoading={contributionStatsLoading}
          className="w-full min-w-0 md:max-w-[min(100%,28rem)] md:flex-1 lg:max-w-none"
        />
      </div>
      <ProfileContributionHeaderStats
        stats={contributionStats}
        isLoading={contributionStatsLoading}
        isError={contributionStatsError}
      />
    </header>
  );
}

type ProfileContributionYearPoint = { year: number; count: number };

type ProfileContributionStats =
  inferRouterOutputs<AppRouter>["users"]["getProfileContributionStats"];

function ProfileContributionStatCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <Card className="border-border bg-surface border">
      <Card.Content className={compact ? "px-2.5 py-2" : "px-4 py-3"}>
        <p
          className={cn(
            "text-muted font-medium tracking-wide uppercase",
            compact ? "text-[10px] leading-tight" : "text-xs",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-foreground font-semibold tabular-nums",
            compact ? "mt-0.5 text-lg" : "mt-1 text-2xl",
          )}
        >
          {value.toLocaleString()}
        </p>
      </Card.Content>
    </Card>
  );
}

function ProfileContributionHeaderStats({
  stats,
  isLoading,
  isError,
}: {
  stats: ProfileContributionStats | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const currentYear = new Date().getFullYear();

  return (
    <section
      aria-labelledby="profile-header-contribution-stats"
      className="border-border w-full border-t pt-4"
    >
      <h2 id="profile-header-contribution-stats" className="sr-only">
        Contribution totals
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="border-border bg-surface border">
              <Card.Content className="px-2.5 py-2">
                <div className="bg-default h-2.5 w-16 animate-pulse rounded" />
                <div className="bg-default mt-1.5 h-6 w-10 animate-pulse rounded" />
              </Card.Content>
            </Card>
          ))}
        </div>
      ) : isError || !stats ? (
        <Card className="border-border bg-surface border border-dashed">
          <Card.Content className="p-3">
            <p className="text-muted text-xs">
              Contribution statistics could not be loaded.
            </p>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ProfileContributionStatCard
            compact
            label="Molecules"
            value={stats.totals.molecules}
          />
          <ProfileContributionStatCard
            compact
            label="NEXAFS datasets"
            value={stats.totals.spectra}
          />
          <ProfileContributionStatCard
            compact
            label={`Molecules in ${currentYear}`}
            value={stats.totals.moleculesThisYear}
          />
          <ProfileContributionStatCard
            compact
            label={`Datasets in ${currentYear}`}
            value={stats.totals.spectraThisYear}
          />
        </div>
      )}
    </section>
  );
}

function ProfileContributionYearChart({
  title,
  description,
  data,
  emptyMessage,
  compact = false,
}: {
  title: string;
  description: string;
  data: ProfileContributionYearPoint[];
  emptyMessage: string;
  compact?: boolean;
}) {
  const maxCount = Math.max(1, ...data.map((point) => point.count));
  const chartSummary =
    data.length > 0
      ? data.map((point) => `${point.year}: ${point.count}`).join(", ")
      : emptyMessage;
  const plotHeight = compact ? "4.5rem" : "7.5rem";

  return (
    <Card className="border-border bg-surface border">
      <Card.Header
        className={cn(
          "border-border border-b",
          compact ? "px-2.5 py-2" : "px-4 py-3",
        )}
      >
        <Card.Title
          className={cn(
            "text-foreground font-semibold",
            compact ? "text-xs leading-tight" : "text-sm",
          )}
        >
          {title}
        </Card.Title>
        <Card.Description
          className={cn(
            "text-muted",
            compact ? "sr-only" : "text-xs",
          )}
        >
          {description}
        </Card.Description>
      </Card.Header>
      <Card.Content className={compact ? "px-2.5 py-2.5" : "px-4 py-4"}>
        {data.length === 0 ? (
          <p className={cn("text-muted", compact ? "text-xs" : "text-sm")}>
            {emptyMessage}
          </p>
        ) : (
          <div
            role="img"
            aria-label={`${title}. ${chartSummary}`}
            className={cn(
              "flex items-end gap-0.5 sm:gap-1",
              compact ? "h-24" : "h-44",
            )}
          >
            {data.map((point) => {
              const heightPercent = Math.round((point.count / maxCount) * 100);
              return (
                <div
                  key={point.year}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5"
                >
                  <span className="text-muted text-[9px] tabular-nums leading-none sm:text-[10px]">
                    {point.count > 0 ? point.count : ""}
                  </span>
                  <div
                    className={cn(
                      "bg-default flex w-full items-end justify-center rounded-t-sm",
                      compact ? "max-w-6" : "max-w-8 sm:max-w-10",
                    )}
                    style={{ height: plotHeight }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-sm",
                        compact ? "max-w-5" : "max-w-6 sm:max-w-8",
                      )}
                      style={{
                        height: `${Math.max(point.count > 0 ? 8 : 0, heightPercent)}%`,
                        backgroundColor: "var(--accent)",
                      }}
                      title={`${point.year}: ${point.count}`}
                    />
                  </div>
                  <span className="text-muted text-[9px] tabular-nums leading-none sm:text-[10px]">
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

function ProfileContributionHeaderYearCharts({
  stats,
  isLoading,
  className,
}: {
  stats: ProfileContributionStats | undefined;
  isLoading: boolean;
  className?: string;
}) {
  if (isLoading) {
    return (
      <section
        aria-labelledby="profile-header-contribution-charts"
        className={cn("min-w-0", className)}
      >
        <h2 id="profile-header-contribution-charts" className="sr-only">
          Contribution activity by year
        </h2>
        <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} className="border-border bg-surface border">
              <Card.Header className="border-border border-b px-2.5 py-2">
                <div className="bg-default h-3 w-24 animate-pulse rounded" />
              </Card.Header>
              <Card.Content className="px-2.5 py-2.5">
                <div className="bg-default h-24 animate-pulse rounded" />
              </Card.Content>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <section
      aria-labelledby="profile-header-contribution-charts"
      className={cn("min-w-0", className)}
    >
      <h2 id="profile-header-contribution-charts" className="sr-only">
        Contribution activity by year
      </h2>
      <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
        <ProfileContributionYearChart
          compact
          title="Molecules per year"
          description="Distinct molecules created or contributed to."
          data={stats.moleculesByYear}
          emptyMessage="No molecules yet."
        />
        <ProfileContributionYearChart
          compact
          title="NEXAFS datasets per year"
          description="Experiments uploaded or collected on."
          data={stats.spectraByYear}
          emptyMessage="No datasets yet."
        />
      </div>
    </section>
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

/**
 * Renders the profile hero GitHub identity row below ORCID: icon, login text, and
 * an external action. Own profiles without a link show a muted prompt row.
 */
export function ProfileGitHubHeaderRow({
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
  const login = github?.login?.trim() ?? null;

  if (profileUrl && login) {
    return (
      <div
        className={cn(
          profileIdentityRowClassName,
          "text-muted min-h-8 flex-wrap py-0",
        )}
      >
        <GitHubIcon className="text-foreground h-5 w-5 shrink-0" aria-hidden />
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-accent font-medium transition-colors"
          aria-label={`View GitHub profile ${login}`}
        >
          {login}
        </a>
      </div>
    );
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <div
      className={cn(
        profileIdentityRowClassName,
        "text-muted min-h-8 flex-wrap py-0 opacity-70",
      )}
    >
      <GitHubIcon className="h-5 w-5 shrink-0 opacity-60" aria-hidden />
      <span>GitHub not linked</span>
      <Button
        size="sm"
        variant="secondary"
        className="h-9 shrink-0"
        onPress={() => {
          window.location.href = GITHUB_LINK_URL;
        }}
      >
        <GitHubIcon className="h-4 w-4 shrink-0" aria-hidden />
        Link GitHub
      </Button>
    </div>
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

function sessionStepUpDescription(
  appCode: SessionWriteAssuranceAppCode | null,
): string {
  if (appCode === "SESSION_AAL3_REQUIRED") {
    return "Administrator and Labs actions require signing in with your hardware security key passkey on this device.";
  }
  return "Deleting or transferring your data requires a passkey-established session. Sign in with a passkey to continue.";
}

function resolveSessionStepUpAppCode(
  sessionWriteAssurance: SessionWriteAssuranceEvaluation | undefined,
  passkeyRequiredRedirect: boolean,
): SessionWriteAssuranceAppCode {
  if (!sessionWriteAssurance) {
    return passkeyRequiredRedirect
      ? "SESSION_AAL3_REQUIRED"
      : "SESSION_AAL_REQUIRED";
  }
  if (
    sessionWriteAssurance.adminRequiredAal === "aal3" &&
    !sessionWriteAssurance.adminSatisfied
  ) {
    return "SESSION_AAL3_REQUIRED";
  }
  if (passkeyRequiredRedirect) {
    return "SESSION_AAL3_REQUIRED";
  }
  return "SESSION_AAL_REQUIRED";
}

export function ProfilePasskeysSection({
  passkeys,
  passkeyEnrollment,
  passkeyRequiredRedirect,
  sessionWriteAssurance,
  isRegistering,
  isDeleting,
  isPasskeySigningIn,
  onRegister,
  onDelete,
  onPasskeySignIn,
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
  sessionWriteAssurance: SessionWriteAssuranceEvaluation | undefined;
  isRegistering: boolean;
  isDeleting: boolean;
  isPasskeySigningIn: boolean;
  onRegister: () => Promise<void>;
  onDelete: (passkeyId: string) => Promise<void>;
  onPasskeySignIn: () => Promise<void>;
}) {
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null);

  const showContributionHint =
    (passkeyRequiredRedirect || passkeyEnrollment?.enrolled === false) &&
    passkeyEnrollment?.enrolled !== true;

  const needsDestructiveStepUp =
    sessionWriteAssurance !== undefined && !sessionWriteAssurance.satisfied;
  const needsAdminStepUp =
    passkeyRequiredRedirect ||
    (sessionWriteAssurance?.adminRequiredAal === "aal3" &&
      sessionWriteAssurance.adminSatisfied === false);

  const showSessionStepUp =
    passkeyEnrollment?.enrolled === true &&
    (needsDestructiveStepUp || needsAdminStepUp);

  const sessionStepUpAppCode = resolveSessionStepUpAppCode(
    sessionWriteAssurance,
    passkeyRequiredRedirect,
  );

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

      {showSessionStepUp ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Confirm with passkey sign-in</Alert.Title>
            <Alert.Description>
              {sessionStepUpDescription(sessionStepUpAppCode)}
            </Alert.Description>
          </Alert.Content>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onPress={() => void onPasskeySignIn()}
              isPending={isPasskeySigningIn}
            >
              Sign in with passkey
            </Button>
          </div>
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

type ProfileMoleculeListItem =
  inferRouterOutputs<AppRouter>["users"]["listProfileMolecules"]["items"][number];

type ProfileExperimentGroup =
  inferRouterOutputs<AppRouter>["users"]["listProfileExperiments"]["groups"][number];

type ProfileContributionsSubview = "molecules" | "nexafs";

const profileNexafsListClassName =
  "w-full space-y-3 [&>li]:[contain-intrinsic-size:0_80px] [&>li]:[content-visibility:auto]";

function profileExperimentLabel(group: ProfileExperimentGroup): string {
  const edgeLabel = `${group.edge.targetatom} ${group.edge.corestate}`;
  return `${group.molecule.displayName} (${edgeLabel})`;
}

const profileMoleculeListClassName =
  "w-full space-y-3 [&>div]:[contain-intrinsic-size:0_80px] [&>div]:[content-visibility:auto]";

const PROFILE_MOLECULES_PAGE_SIZE = 12;
const PROFILE_NEXAFS_PAGE_SIZE = 12;

function ProfileMoleculeContributionChips({
  contributions,
}: {
  contributions: ProfileMoleculeListItem["contributions"];
}) {
  if (contributions.length === 0) {
    return null;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 px-1">
      {contributions.map((role) => (
        <Chip key={role} size="sm" variant="soft">
          {moleculeContributionTypeLabel(role)}
        </Chip>
      ))}
    </div>
  );
}

const profileContributionsPaginationLinkClassName =
  "rounded-lg border border-border bg-surface text-foreground";

const profileContributionsPaginationActiveClassName =
  "border-accent bg-accent text-accent-foreground";

function ProfileContributionsPagination({
  currentPage,
  totalPages,
  onPageChange,
  ariaLabel,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel: string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-6 flex justify-center sm:justify-end"
    >
      <Pagination size="sm" className="gap-2">
        <Pagination.Content className="gap-2">
          <Pagination.Item>
            <Pagination.Previous
              isDisabled={currentPage <= 1}
              aria-label="Previous page"
              onPress={() => onPageChange(Math.max(1, currentPage - 1))}
              className={profileContributionsPaginationLinkClassName}
            >
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>
          {totalPages <= 20
            ? Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <Pagination.Item key={page}>
                    <Pagination.Link
                      isActive={page === currentPage}
                      onPress={() => onPageChange(page)}
                      className={`${profileContributionsPaginationLinkClassName} ${
                        page === currentPage
                          ? profileContributionsPaginationActiveClassName
                          : ""
                      }`}
                    >
                      {page}
                    </Pagination.Link>
                  </Pagination.Item>
                ),
              )
            : null}
          {totalPages > 20 ? (
            <Pagination.Item>
              <span className="text-muted px-2 text-xs tabular-nums">
                {currentPage} / {totalPages}
              </span>
            </Pagination.Item>
          ) : null}
          <Pagination.Item>
            <Pagination.Next
              isDisabled={currentPage >= totalPages}
              aria-label="Next page"
              onPress={() =>
                onPageChange(Math.min(totalPages, currentPage + 1))
              }
              className={profileContributionsPaginationLinkClassName}
            >
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </nav>
  );
}

const profileDangerZoneAccordionId = "profile-contributions-danger-zone";

function ProfileContributionsDangerZoneAccordion({
  description,
  dangerZoneOpen,
  onDangerZoneOpenChange,
}: {
  description: string;
  dangerZoneOpen: boolean;
  onDangerZoneOpenChange: (open: boolean) => void;
}) {
  return (
    <Accordion
      allowsMultipleExpanded
      variant="surface"
      aria-label="Danger zone for contributed data"
      className="border-border w-full rounded-lg border"
      expandedKeys={
        dangerZoneOpen
          ? new Set([profileDangerZoneAccordionId])
          : new Set()
      }
      onExpandedChange={(keys) => {
        onDangerZoneOpenChange(
          [...keys].map(String).includes(profileDangerZoneAccordionId),
        );
      }}
    >
      <Accordion.Item id={profileDangerZoneAccordionId}>
        <Accordion.Heading>
          <Accordion.Trigger className="flex w-full items-center gap-2 text-start">
            <span className="text-foreground min-w-0 flex-1 text-sm font-semibold">
              Danger zone
            </span>
            <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
              <ChevronDownIcon className="h-4 w-4" aria-hidden />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="pt-0">
            <p className="text-muted text-sm">{description}</p>
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function ProfileMoleculeGridSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className={profileMoleculeListClassName}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <MoleculeCompactSkeleton />
        </div>
      ))}
    </div>
  );
}

function ProfileNexafsListSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <NexafsExperimentCompactSkeleton key={index} />
      ))}
    </div>
  );
}

const profileTabListClassName =
  "border-border bg-surface flex w-full flex-wrap gap-1 rounded-xl border p-1";

function ProfileTabBarSkeleton({
  tabs,
  className,
}: {
  tabs: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(profileTabListClassName, className)}
      aria-hidden
    >
      {tabs.map((label) => (
        <div
          key={label}
          className="flex flex-1 items-center justify-center px-4 py-2"
        >
          <LoadingSkeleton className="h-4 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ProfilePageShell({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-muted hover:text-accent text-sm transition-colors"
        >
          Back to home
        </Link>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <header className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-4 sm:gap-5 sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
          <LoadingSkeleton className="ring-border h-[4.5rem] w-[4.5rem] shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-background sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1 pt-0.5">
            <LoadingSkeleton className="mb-2 h-8 w-48 max-w-full rounded sm:h-9" />
            <div className="flex flex-col gap-2">
              <LoadingSkeleton className="h-5 w-40 max-w-full rounded" />
              <LoadingSkeleton className="h-5 w-32 max-w-full rounded" />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <LoadingSkeleton className="h-6 w-24 rounded-full" />
              <LoadingSkeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <ProfileContributionHeaderYearCharts
          stats={undefined}
          isLoading
          className="w-full min-w-0 md:max-w-[min(100%,28rem)] md:flex-1 lg:max-w-none"
        />
      </div>
      <ProfileContributionHeaderStats
        stats={undefined}
        isLoading
        isError={false}
      />
    </header>
  );
}

export function ProfileMainTabsSkeleton({
  showSecurity = false,
}: {
  showSecurity?: boolean;
}) {
  return (
    <ProfileTabBarSkeleton
      tabs={
        showSecurity
          ? ["Contributions", "Preferences", "Security"]
          : ["Contributions"]
      }
    />
  );
}

function ProfileDangerZoneAccordionSkeleton() {
  return (
    <div
      className="border-border flex w-full items-center gap-2 rounded-lg border px-4 py-3"
      aria-hidden
    >
      <LoadingSkeleton className="h-4 w-28 rounded" />
      <LoadingSkeleton className="ms-auto h-4 w-4 shrink-0 rounded" />
    </div>
  );
}

export function ProfileContributionsSectionSkeleton({
  showDangerZoneAccordion = false,
}: {
  showDangerZoneAccordion?: boolean;
} = {}) {
  return (
    <div className="space-y-0">
      <ProfileTabBarSkeleton
        tabs={["Molecules", "NEXAFS"]}
        className="sm:max-w-md"
      />
      <div className="space-y-10 pt-6">
        <section aria-busy="true" aria-label="Loading molecules">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div className="space-y-2">
              <LoadingSkeleton className="h-7 w-28 rounded" />
              <LoadingSkeleton className="h-4 w-full max-w-md rounded" />
            </div>
            <LoadingSkeleton className="h-9 w-40 rounded-full" />
          </div>
          {showDangerZoneAccordion ? (
            <div className="mb-4 space-y-2">
              <ProfileDangerZoneAccordionSkeleton />
              <LoadingSkeleton className="h-4 w-full max-w-xl rounded" />
            </div>
          ) : null}
          <ProfileMoleculeGridSkeleton rows={4} />
        </section>
      </div>
    </div>
  );
}

export function ProfileSecuritySectionSkeleton() {
  return (
    <div
      className="border-border bg-surface space-y-6 rounded-2xl border p-5 sm:p-6"
      aria-busy="true"
      aria-label="Loading security settings"
    >
      <div className="space-y-2">
        <LoadingSkeleton className="h-6 w-40 rounded" />
        <LoadingSkeleton className="h-4 w-full max-w-lg rounded" />
      </div>
      <div className="border-border space-y-3 border-t pt-6">
        <LoadingSkeleton className="h-5 w-24 rounded" />
        <LoadingSkeleton className="h-10 w-full max-w-md rounded-lg" />
      </div>
      <div className="border-border space-y-3 border-t pt-6">
        <LoadingSkeleton className="h-5 w-16 rounded" />
        <LoadingSkeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function ProfilePageSkeleton({
  showSecurity = true,
  showDangerZoneAccordion = false,
}: {
  showSecurity?: boolean;
  showDangerZoneAccordion?: boolean;
} = {}) {
  return (
    <>
      <ProfileHeaderSkeleton />
      {showSecurity ? <ProfileMainTabsSkeleton showSecurity /> : null}
      <ProfileContributionsSectionSkeleton
        showDangerZoneAccordion={showDangerZoneAccordion}
      />
    </>
  );
}

export function ProfileContributionsSection({
  userId,
  isOwnProfile,
  onSessionAalRequired,
}: {
  userId: string;
  isOwnProfile: boolean;
  onSessionAalRequired?: () => void;
}) {
  const [contributionsSubview, setContributionsSubview] =
    useState<ProfileContributionsSubview>("molecules");
  const [moleculesPage, setMoleculesPage] = useState(1);
  const [nexafsPage, setNexafsPage] = useState(1);

  useEffect(() => {
    setMoleculesPage(1);
    setNexafsPage(1);
  }, [contributionsSubview, userId]);

  const moleculesOffset = (moleculesPage - 1) * PROFILE_MOLECULES_PAGE_SIZE;
  const nexafsOffset = (nexafsPage - 1) * PROFILE_NEXAFS_PAGE_SIZE;

  const { data: moleculesData, isLoading: moleculesLoading } =
    trpc.users.listProfileMolecules.useQuery({
      userId,
      limit: PROFILE_MOLECULES_PAGE_SIZE,
      offset: moleculesOffset,
    });

  const { data: experimentsData, isLoading: experimentsLoading } =
    trpc.users.listProfileExperiments.useQuery({
      userId,
      limit: PROFILE_NEXAFS_PAGE_SIZE,
      offset: nexafsOffset,
    });

  const molecules = moleculesData?.items ?? [];
  const moleculesTotal = moleculesData?.total ?? 0;
  const moleculesTotalPages = Math.max(
    1,
    Math.ceil(moleculesTotal / PROFILE_MOLECULES_PAGE_SIZE),
  );

  const experimentGroups = experimentsData?.groups ?? [];
  const nexafsTotal = experimentsData?.total ?? 0;
  const nexafsTotalPages = Math.max(
    1,
    Math.ceil(nexafsTotal / PROFILE_NEXAFS_PAGE_SIZE),
  );
  const nexafsDatasetCount = nexafsTotal;

  useEffect(() => {
    if (moleculesPage > moleculesTotalPages) {
      setMoleculesPage(moleculesTotalPages);
    }
  }, [moleculesPage, moleculesTotalPages]);

  useEffect(() => {
    if (nexafsPage > nexafsTotalPages) {
      setNexafsPage(nexafsTotalPages);
    }
  }, [nexafsPage, nexafsTotalPages]);

  return (
    <div className="space-y-0">
      <Tabs
        selectedKey={contributionsSubview}
        onSelectionChange={(key) => {
          const next = String(key);
          if (next === "molecules" || next === "nexafs") {
            queueMicrotask(() => setContributionsSubview(next));
          }
        }}
        className="w-full"
      >
      <Tabs.ListContainer className="w-full">
        <Tabs.List
          aria-label="Contribution types"
          className="border-border bg-surface flex w-full flex-wrap gap-1 rounded-xl border p-1 sm:max-w-md"
        >
          <Tabs.Tab id="molecules" className="flex-1 px-4 py-2 text-sm font-medium">
            Molecules
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="nexafs" className="flex-1 px-4 py-2 text-sm font-medium">
            NEXAFS
            {!experimentsLoading && nexafsDatasetCount > 0 ? (
              <span className="text-muted ms-1.5 tabular-nums">
                ({nexafsDatasetCount.toLocaleString()})
              </span>
            ) : null}
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="molecules" className="space-y-10 pt-6">
        <section aria-labelledby="profile-molecules-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="profile-molecules-heading"
                className="text-foreground text-xl font-semibold"
              >
                Molecules
              </h2>
              <p className="text-muted mt-1 text-sm">
                Molecules you linked to X-ray Atlas or edited.
              </p>
            </div>
            <AccentNavChip
              href={`/browse/molecules?q=${encodeURIComponent(userId)}`}
              label="Browse all molecules"
              icon={BeakerIcon}
            />
          </div>

          <ProfileMoleculesList
            userId={userId}
            isOwnProfile={isOwnProfile}
            molecules={molecules}
            isLoading={moleculesLoading}
            onSessionAalRequired={onSessionAalRequired}
            pagination={{
              currentPage: moleculesPage,
              totalPages: moleculesTotalPages,
              onPageChange: setMoleculesPage,
            }}
          />
        </section>
      </Tabs.Panel>

      <Tabs.Panel id="nexafs" className="pt-6">
        <section aria-labelledby="profile-nexafs-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="profile-nexafs-heading"
                className="text-foreground text-xl font-semibold"
              >
                NEXAFS datasets
              </h2>
              <p className="text-muted mt-1 text-sm">
                Datasets you uploaded or are listed as a collector on.
              </p>
            </div>
            <AccentNavChip
              href="/browse/nexafs"
              label="Browse NEXAFS catalog"
              icon={BoltIcon}
            />
          </div>

          <ProfileNexafsList
            userId={userId}
            isOwnProfile={isOwnProfile}
            experimentGroups={experimentGroups}
            isLoading={experimentsLoading}
            onSessionAalRequired={onSessionAalRequired}
            pagination={{
              currentPage: nexafsPage,
              totalPages: nexafsTotalPages,
              onPageChange: setNexafsPage,
            }}
          />
        </section>
      </Tabs.Panel>
      </Tabs>
    </div>
  );
}

type ProfileContributionsPaginationState = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function ProfileNexafsList({
  userId,
  isOwnProfile,
  experimentGroups,
  isLoading,
  pagination,
  onSessionAalRequired,
}: {
  userId: string;
  isOwnProfile: boolean;
  experimentGroups: ProfileExperimentGroup[];
  isLoading: boolean;
  pagination: ProfileContributionsPaginationState;
  onSessionAalRequired?: () => void;
}) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();
  const removeExperiment = trpc.experiments.remove.useMutation();
  const transferOwnership = trpc.experiments.transferOwnership.useMutation();
  const removeCollector = trpc.experiments.removeCollector.useMutation();
  const confirmClaimContributions =
    trpc.experiments.confirmClaimContributions.useMutation();
  const setClaimState = trpc.experiments.setClaimState.useMutation();
  const setContributionVisibility =
    trpc.experiments.setContributionVisibility.useMutation();
  const { data: unclaimedContributions } =
    trpc.experiments.listMyUnclaimedContributions.useQuery(undefined, {
      enabled: isOwnProfile,
    });
  const getDeleteDataPointImpact =
    trpc.experiments.getDeleteDataPointImpact.useMutation();
  const { data: coreMaintainers } = trpc.users.getCoreMaintainers.useQuery(
    undefined,
    { enabled: isOwnProfile && session?.user?.id === userId },
  );

  const [deleteDialogExperimentId, setDeleteDialogExperimentId] = useState<
    string | null
  >(null);
  const [deleteDataPointsRemoved, setDeleteDataPointsRemoved] = useState<
    number | null
  >(null);
  const deleteImpactRequestIdRef = useRef<string | null>(null);
  const [transferDialogExperimentId, setTransferDialogExperimentId] =
    useState<string | null>(null);
  const [transferRecipientUserId, setTransferRecipientUserId] = useState<
    string | null
  >(null);
  const [expandedManageExperimentIds, setExpandedManageExperimentIds] =
    useState(() => new Set<string>());
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);
  const [selectedExperimentIds, setSelectedExperimentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedUnclaimedIds, setSelectedUnclaimedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleManageExperiment = (experimentId: string) => {
    setExpandedManageExperimentIds((previous) => {
      const next = new Set(previous);
      if (next.has(experimentId)) {
        next.delete(experimentId);
      } else {
        next.add(experimentId);
      }
      return next;
    });
  };

  const experimentById = new Map(
    experimentGroups.map((group) => [group.experimentId, group]),
  );

  const pendingDeleteExperiment =
    deleteDialogExperimentId !== null
      ? (experimentById.get(deleteDialogExperimentId) ?? null)
      : null;

  const pendingTransferExperiment =
    transferDialogExperimentId !== null
      ? (experimentById.get(transferDialogExperimentId) ?? null)
      : null;

  const openDelete = (experimentId: string) => {
    deleteImpactRequestIdRef.current = experimentId;
    setDeleteDataPointsRemoved(null);
    setDeleteDialogExperimentId(experimentId);
    void getDeleteDataPointImpact
      .mutateAsync({ experimentId })
      .then((res) => {
        if (deleteImpactRequestIdRef.current === experimentId) {
          setDeleteDataPointsRemoved(res.dataPointsRemoved);
        }
      })
      .catch((error) => {
        handlePrivilegedWriteError(
          error,
          showToast,
          onSessionAalRequired,
          "Failed to calculate delete impact",
        );
        if (deleteImpactRequestIdRef.current === experimentId) {
          setDeleteDataPointsRemoved(-1);
        }
      });
  };

  const closeDelete = () => {
    setDeleteDialogExperimentId(null);
    setDeleteDataPointsRemoved(null);
  };

  const openTransfer = (experimentId: string) => {
    setTransferDialogExperimentId(experimentId);
    setTransferRecipientUserId(null);
  };

  const closeTransfer = () => {
    setTransferDialogExperimentId(null);
    setTransferRecipientUserId(null);
  };

  const invalidateProfileExperiments = async () => {
    await Promise.all([
      utils.users.listProfileExperiments.invalidate({ userId }),
      utils.experiments.listMyUnclaimedContributions.invalidate(),
    ]);
  };

  const toggleExperimentSelection = (experimentId: string) => {
    setSelectedExperimentIds((previous) => {
      const next = new Set(previous);
      if (next.has(experimentId)) {
        next.delete(experimentId);
      } else {
        next.add(experimentId);
      }
      return next;
    });
  };

  const toggleUnclaimedSelection = (experimentId: string) => {
    setSelectedUnclaimedIds((previous) => {
      const next = new Set(previous);
      if (next.has(experimentId)) {
        next.delete(experimentId);
      } else {
        next.add(experimentId);
      }
      return next;
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialogExperimentId) return;
    try {
      await removeExperiment.mutateAsync({
        experimentId: deleteDialogExperimentId,
      });
      await invalidateProfileExperiments();
      closeDelete();
      showToast("NEXAFS dataset deleted", "success");
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to delete NEXAFS dataset",
      );
    }
  };

  const handleTransferConfirm = async () => {
    if (!transferDialogExperimentId || !transferRecipientUserId) return;
    try {
      await transferOwnership.mutateAsync({
        experimentId: transferDialogExperimentId,
        newCreatorId: transferRecipientUserId,
      });
      await invalidateProfileExperiments();
      closeTransfer();
      showToast("Dataset ownership transferred", "success");
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to transfer dataset ownership",
      );
    }
  };

  const handleRemoveCollector = async (experimentId: string) => {
    try {
      await removeCollector.mutateAsync({ experimentId });
      await invalidateProfileExperiments();
      setExpandedManageExperimentIds((previous) => {
        const next = new Set(previous);
        next.delete(experimentId);
        return next;
      });
      showToast("Removed your collector listing", "success");
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to remove collector listing",
      );
    }
  };

  const handleBulkContributionVisibility = async (visibleProfile: boolean) => {
    const experimentIds = Array.from(selectedExperimentIds);
    if (experimentIds.length === 0) {
      showToast("Select at least one dataset first", "error", 0);
      return;
    }
    try {
      await setContributionVisibility.mutateAsync({
        experimentIds,
        visibleProfile,
      });
      await invalidateProfileExperiments();
      showToast(
        visibleProfile
          ? "Contributor profiles are now visible"
          : "Contributor profiles detached to ORCID-only",
        "success",
      );
      setSelectedExperimentIds(new Set());
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to update contribution visibility",
      );
    }
  };

  const handleConfirmClaim = async () => {
    const experimentIds = Array.from(selectedUnclaimedIds);
    if (experimentIds.length === 0) {
      showToast("Select at least one unclaimed dataset", "error", 0);
      return;
    }
    try {
      await confirmClaimContributions.mutateAsync({ experimentIds });
      await invalidateProfileExperiments();
      showToast("Claimed selected contributions", "success");
      setSelectedUnclaimedIds(new Set());
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to claim contributions",
      );
    }
  };

  const handleRemainUnclaimed = async () => {
    const experimentIds = Array.from(selectedUnclaimedIds);
    if (experimentIds.length === 0) {
      showToast("Select at least one unclaimed dataset", "error", 0);
      return;
    }
    try {
      await setClaimState.mutateAsync({ experimentIds, claim: false });
      await invalidateProfileExperiments();
      showToast("Selected datasets remain unclaimed", "success");
      setSelectedUnclaimedIds(new Set());
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to update claim state",
      );
    }
  };

  const ownsAnyExperiment = experimentGroups.some((group) =>
    group.profileContributions.includes("creator"),
  );
  const collectsAnyExperiment = experimentGroups.some((group) =>
    group.profileContributions.includes("collector"),
  );
  const showDangerZone =
    isOwnProfile && (ownsAnyExperiment || collectsAnyExperiment);

  const manageableExperimentIds = useMemo(
    () =>
      experimentGroups
        .filter((group) => {
          if (!isOwnProfile) return false;
          return (
            group.profileContributions.includes("creator") ||
            group.profileContributions.includes("collector")
          );
        })
        .map((group) => group.experimentId),
    [experimentGroups, isOwnProfile],
  );

  useEffect(() => {
    if (!dangerZoneOpen) {
      setExpandedManageExperimentIds(new Set());
      setSelectedExperimentIds(new Set());
      return;
    }
    setExpandedManageExperimentIds(new Set(manageableExperimentIds));
  }, [dangerZoneOpen, manageableExperimentIds]);

  useEffect(() => {
    setSelectedUnclaimedIds(new Set());
  }, [userId]);

  if (isLoading) {
    return <ProfileNexafsListSkeleton rows={2} />;
  }

  if (experimentGroups.length === 0) {
    return (
      <Card className="border-border bg-surface border border-dashed">
        <Card.Content className="p-6">
          <p className="text-muted text-sm">
            No NEXAFS experiments linked to this profile yet.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const recipientOptions = (() => {
    if (!pendingTransferExperiment) return [];
    const contributors = pendingTransferExperiment.contributorUsers
      .filter((user) => user.userId != null && user.isPublicProfileVisible)
      .map((user) => ({
        id: user.userId!,
        name: user.name,
        image: user.image,
        kind: "contributor" as const,
      }));
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
        byId.set(u.id, u);
      }
    }

    return Array.from(byId.values()).filter((u) => u.id !== userId);
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

  const nexafsDangerZoneDescription = ownsAnyExperiment
    ? collectsAnyExperiment
      ? "Delete or transfer datasets you uploaded. For datasets you only collected on, remove your collector listing without deleting the experiment."
      : "Delete datasets you uploaded or transfer ownership. Deleting removes the experiment and spectrum points; transferring keeps the record and changes the owner."
    : "Remove yourself as a collector on datasets you did not upload, without deleting the experiment.";

  const nexafsList = (
    <ul className={profileNexafsListClassName}>
        {experimentGroups.map((group) => {
          const { key, props } = mapNexafsBrowseGroupToCard(group);
          const label = profileExperimentLabel(group);
          const canManageCreator =
            isOwnProfile && group.profileContributions.includes("creator");
          const canLeaveCollector =
            isOwnProfile && group.profileContributions.includes("collector");
          const canManage =
            dangerZoneOpen && (canManageCreator || canLeaveCollector);
          const manageExpanded = expandedManageExperimentIds.has(
            group.experimentId,
          );

          if (canManage && manageExpanded) {
            return (
              <li key={key}>
                <div className="flex min-w-0 items-stretch gap-3">
                  <div className="self-stretch">
                    <ProfileDangerZoneRail
                      subjectLabel={label}
                      showDelete={canManageCreator}
                      onDelete={
                        canManageCreator
                          ? () => openDelete(group.experimentId)
                          : undefined
                      }
                      deleteDisabled={
                        removeExperiment.isPending &&
                        deleteDialogExperimentId === group.experimentId
                      }
                      showTransfer={canManageCreator}
                      onTransfer={
                        canManageCreator
                          ? () => openTransfer(group.experimentId)
                          : undefined
                      }
                      extraActions={
                        canLeaveCollector ? (
                          <>
                            {canManageCreator ? (
                              <div className="border-border h-px w-full border-t" />
                            ) : null}
                            <Tooltip delay={0}>
                              <Tooltip.Trigger>
                                <span className="inline-flex h-11 w-11 flex-none">
                                  <Button
                                    isIconOnly
                                    aria-label={`Remove collector listing for ${label}`}
                                    onPress={() =>
                                      void handleRemoveCollector(
                                        group.experimentId,
                                      )
                                    }
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                      "text-warning h-11 w-11 rounded-none rounded-b-lg",
                                      !canManageCreator && "rounded-t-lg",
                                    )}
                                    isPending={removeCollector.isPending}
                                  >
                                    <UserMinus className="h-4 w-4" />
                                  </Button>
                                </span>
                              </Tooltip.Trigger>
                              <Tooltip.Content placement="right top">
                                Leave collector listing
                              </Tooltip.Content>
                            </Tooltip>
                          </>
                        ) : null
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex justify-end">
                      <Checkbox
                        isSelected={selectedExperimentIds.has(group.experimentId)}
                        onChange={() =>
                          toggleExperimentSelection(group.experimentId)
                        }
                        aria-label={`Select dataset ${label}`}
                      />
                    </div>
                    <NexafsExperimentCompactCard {...props} />
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={key}>
              {canManage ? (
                <div className="group relative">
                  <NexafsExperimentCompactCard {...props} />
                  <div className="absolute end-12 top-2 z-10">
                    <Checkbox
                      isSelected={selectedExperimentIds.has(group.experimentId)}
                      onChange={() =>
                        toggleExperimentSelection(group.experimentId)
                      }
                      aria-label={`Select dataset ${label}`}
                    />
                  </div>
                  <Button
                    isIconOnly
                    aria-label={`Manage NEXAFS dataset ${label}`}
                    aria-expanded={false}
                    onPress={() => toggleManageExperiment(group.experimentId)}
                    size="sm"
                    variant="ghost"
                    className="absolute end-2 top-2 z-10 h-8 w-8 opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ) : (
                <NexafsExperimentCompactCard {...props} />
              )}
            </li>
          );
        })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {isOwnProfile && (unclaimedContributions?.length ?? 0) > 0 ? (
        <Card className="border-border bg-surface border">
          <Card.Header className="border-border border-b px-4 py-3">
            <Card.Title className="text-foreground text-sm font-semibold">
              Unclaimed ORCID contributions
            </Card.Title>
            <Card.Description className="text-muted text-xs">
              Confirm claim to show your name and avatar. Until claimed, only your ORCID is shown.
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                onPress={() => void handleConfirmClaim()}
                isPending={confirmClaimContributions.isPending}
              >
                Confirm claim
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => void handleRemainUnclaimed()}
                isPending={setClaimState.isPending}
              >
                Remain unclaimed
              </Button>
            </div>
            <ul className="space-y-2">
              {unclaimedContributions?.map((row) => (
                <li key={`unclaimed-${row.experimentId}`}>
                  <label className="border-border bg-default/20 flex items-start gap-2 rounded-lg border p-2">
                    <Checkbox
                      isSelected={selectedUnclaimedIds.has(row.experimentId)}
                      onChange={() => toggleUnclaimedSelection(row.experimentId)}
                      aria-label={`Select unclaimed experiment ${row.experiment.id}`}
                    />
                    <span className="min-w-0 text-sm">
                      <span className="text-foreground block font-medium">
                        {row.experiment.moleculeName} ({row.experiment.edgeLabel})
                      </span>
                      <span className="text-muted block text-xs">
                        {row.experiment.instrumentName}
                        {row.experiment.facilityName
                          ? ` | ${row.experiment.facilityName}`
                          : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      ) : null}
      {showDangerZone ? (
        <>
          <ProfileContributionsDangerZoneAccordion
            description={nexafsDangerZoneDescription}
            dangerZoneOpen={dangerZoneOpen}
            onDangerZoneOpenChange={setDangerZoneOpen}
          />
          {!dangerZoneOpen ? (
            <p className="text-muted text-sm">
              Expand Danger zone to delete, transfer ownership, or remove your
              collector listing on contributed datasets.
            </p>
          ) : (
            <div className="border-border bg-default/20 flex flex-wrap items-center gap-2 rounded-lg border p-2">
              <Button
                size="sm"
                variant="ghost"
                onPress={() =>
                  setSelectedExperimentIds(
                    new Set(experimentGroups.map((group) => group.experimentId)),
                  )
                }
              >
                Select all datasets
              </Button>
              <Button
                size="sm"
                variant="danger"
                onPress={() => void handleBulkContributionVisibility(false)}
                isPending={setContributionVisibility.isPending}
              >
                Detach profile details
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onPress={() => void handleBulkContributionVisibility(true)}
                isPending={setContributionVisibility.isPending}
              >
                Restore profile details
              </Button>
            </div>
          )}
        </>
      ) : null}
      {nexafsList}

      <ProfileContributionsPagination
        ariaLabel="NEXAFS contributions pages"
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.onPageChange}
      />

      <SimpleDialog
        isOpen={deleteDialogExperimentId !== null}
        onClose={closeDelete}
        title="Delete NEXAFS dataset permanently?"
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
                  {pendingDeleteExperiment
                    ? profileExperimentLabel(pendingDeleteExperiment)
                    : "this dataset"}
                </span>
                . This removes{" "}
                <span className="tabular-nums font-semibold">
                  {deleteDataPointsRemoved === null
                    ? "…"
                    : deleteDataPointsRemoved < 0
                      ? "unknown"
                      : deleteDataPointsRemoved.toLocaleString()}
                </span>{" "}
                spectrum points and cannot be undone.
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
                const id = deleteDialogExperimentId;
                closeDelete();
                if (id) openTransfer(id);
              }}
            >
              Transfer instead
            </Button>
            <Button
              variant="danger"
              onPress={() => void handleDeleteConfirm()}
              isPending={removeExperiment.isPending}
            >
              Delete dataset
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={transferDialogExperimentId !== null}
        onClose={closeTransfer}
        title="Transfer NEXAFS dataset ownership"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">
            Transfer{" "}
            <span className="text-foreground font-semibold">
              {pendingTransferExperiment
                ? profileExperimentLabel(pendingTransferExperiment)
                : "this dataset"}
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

function ProfileMoleculesList({
  userId,
  isOwnProfile,
  molecules,
  isLoading,
  pagination,
  onSessionAalRequired,
}: {
  userId: string;
  isOwnProfile: boolean;
  molecules: ProfileMoleculeListItem[];
  isLoading: boolean;
  pagination: ProfileContributionsPaginationState;
  onSessionAalRequired?: () => void;
}) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { toasts, removeToast, showToast } = useToast();
  const transferOwnership = trpc.molecules.transferOwnership.useMutation();
  const removeMolecule = trpc.molecules.remove.useMutation();
  const getDeleteDataPointImpact =
    trpc.molecules.getDeleteDataPointImpact.useMutation();
  const { data: coreMaintainers } = trpc.users.getCoreMaintainers.useQuery(
    undefined,
    { enabled: isOwnProfile && session?.user?.id === userId },
  );

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
  const [expandedManageMoleculeIds, setExpandedManageMoleculeIds] = useState(
    () => new Set<string>(),
  );
  const [dangerZoneOpen, setDangerZoneOpen] = useState(false);

  const toggleManageMolecule = (moleculeId: string) => {
    setExpandedManageMoleculeIds((previous) => {
      const next = new Set(previous);
      if (next.has(moleculeId)) {
        next.delete(moleculeId);
      } else {
        next.add(moleculeId);
      }
      return next;
    });
  };

  const moleculeById = new Map(
    molecules.map((item) => [item.molecule.id, item.molecule]),
  );

  const pendingDeleteMolecule =
    deleteDialogMoleculeId !== null
      ? (moleculeById.get(deleteDialogMoleculeId) ?? null)
      : null;

  const pendingTransferMolecule =
    transferDialogMoleculeId !== null
      ? (moleculeById.get(transferDialogMoleculeId) ?? null)
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
        handlePrivilegedWriteError(
          error,
          showToast,
          onSessionAalRequired,
          "Failed to calculate delete impact",
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

  const handleDeleteConfirm = async () => {
    if (!deleteDialogMoleculeId) return;
    try {
      await removeMolecule.mutateAsync({ moleculeId: deleteDialogMoleculeId });
      await utils.users.listProfileMolecules.invalidate({ userId });
      closeDelete();
      showToast("Molecule deleted", "success");
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to remove molecule from database",
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
      await utils.users.listProfileMolecules.invalidate({ userId });
      closeTransfer();
      showToast("Ownership transferred", "success");
    } catch (error) {
      handlePrivilegedWriteError(
        error,
        showToast,
        onSessionAalRequired,
        "Failed to transfer molecule ownership",
      );
    }
  };

  const ownsAnyMolecule = molecules.some((item) => item.isOwner);
  const showDangerZone = isOwnProfile && ownsAnyMolecule;

  const ownerMoleculeIds = useMemo(
    () =>
      molecules
        .filter((item) => item.isOwner)
        .map((item) => item.molecule.id),
    [molecules],
  );

  useEffect(() => {
    if (!dangerZoneOpen) {
      setExpandedManageMoleculeIds(new Set());
      return;
    }
    setExpandedManageMoleculeIds(new Set(ownerMoleculeIds));
  }, [dangerZoneOpen, ownerMoleculeIds]);

  if (isLoading) {
    return <ProfileMoleculeGridSkeleton />;
  }

  if (molecules.length === 0) {
    return (
      <Card className="border-border bg-surface border border-dashed">
        <Card.Content className="p-6">
          <p className="text-muted text-sm">
            No molecules linked to this profile yet.
          </p>
        </Card.Content>
      </Card>
    );
  }

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

  const moleculeList = (
    <div className={profileMoleculeListClassName}>
        {molecules.map(({ molecule, contributions, isOwner }) => {
          const canManage =
            dangerZoneOpen &&
            isOwnProfile &&
            isOwner;
          const manageExpanded = expandedManageMoleculeIds.has(molecule.id);

          if (canManage && manageExpanded) {
            return (
              <div key={molecule.id}>
                <div className="flex min-w-0 items-stretch gap-3">
                  <div className="self-stretch">
                    <ProfileDangerZoneRail
                      subjectLabel={molecule.name}
                      onDelete={() => openDelete(molecule.id)}
                      deleteDisabled={
                        removeMolecule.isPending &&
                        deleteDialogMoleculeId === molecule.id
                      }
                      onTransfer={() => openTransfer(molecule.id)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <MoleculeDisplayCompact
                      molecule={molecule}
                      enableRealtime={false}
                    />
                    <ProfileMoleculeContributionChips
                      contributions={contributions}
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={molecule.id}>
              {canManage ? (
                <div className="group relative">
                  <MoleculeDisplayCompact
                    molecule={molecule}
                    enableRealtime={false}
                  />
                  <ProfileMoleculeContributionChips
                    contributions={contributions}
                  />
                  <Button
                    isIconOnly
                    aria-label={`Manage molecule ${molecule.name}`}
                    aria-expanded={false}
                    onPress={() => toggleManageMolecule(molecule.id)}
                    size="sm"
                    variant="ghost"
                    className="absolute end-2 top-2 z-10 h-8 w-8 opacity-100"
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              ) : (
                <>
                  <MoleculeDisplayCompact
                    molecule={molecule}
                    enableRealtime={false}
                  />
                  <ProfileMoleculeContributionChips
                    contributions={contributions}
                  />
                </>
              )}
            </div>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {showDangerZone ? (
        <>
          <ProfileContributionsDangerZoneAccordion
            description="Delete molecules you created or transfer ownership to another researcher. Deleting removes the molecule and related records; transferring keeps the record and changes the owner."
            dangerZoneOpen={dangerZoneOpen}
            onDangerZoneOpenChange={setDangerZoneOpen}
          />
          {!dangerZoneOpen ? (
            <p className="text-muted text-sm">
              Expand Danger zone to delete or transfer ownership of molecules you
              created.
            </p>
          ) : null}
        </>
      ) : null}
      {moleculeList}

      <ProfileContributionsPagination
        ariaLabel="Molecule contributions pages"
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={pagination.onPageChange}
      />

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
