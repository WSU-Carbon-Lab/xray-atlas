"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, Lock } from "lucide-react";
import {
  Accordion,
  Button,
  Card,
  Chip,
  Label,
  ListBox,
  Select,
  Separator,
  Spinner,
  Tooltip,
} from "@heroui/react";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import {
  attributionDisplayModeLabel,
  autoAcceptModeLabel,
  resolveAttributionPublicDisplay,
  type AttributionDisplayMode,
  type AttributionDisplayPreferences,
  type AutoAcceptMode,
  type ExperimentContributorClaimStatus,
  type UserAttributionPreferencesView,
} from "~/lib/dataset-attribution-claim";
import { ResearcherAvatar } from "~/components/ui/avatar";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";

const ATTRIBUTION_PREFERENCES_ACCORDION_ID = "attribution-preferences";

const AUTO_ACCEPT_DETAIL =
  "Automatically accept future dataset attributions assigned to your ORCID. You can change this at any time.";

const DISPLAY_STATE_DETAILS = {
  pending:
    "How your credit appears on browse and contribute surfaces before you accept the attribution.",
  accepted:
    "How your credit appears after you accept attribution on a dataset.",
  unclaimed:
    "How your credit appears when you decline or unclaim a dataset attribution.",
} as const;

const PENDING_ROLE_DETAIL =
  "Administrators and maintainers always show name and profile on pending attributions. This preference is set by your role and cannot be changed here.";

type DisplayPreferenceKey = keyof AttributionDisplayPreferences;

const DISPLAY_STATE_LABELS: Record<DisplayPreferenceKey, string> = {
  pending: "Pending",
  accepted: "Accepted",
  unclaimed: "Unclaimed or declined",
};

const DISPLAY_PREFERENCE_KEYS: DisplayPreferenceKey[] = [
  "pending",
  "accepted",
  "unclaimed",
];

const DISPLAY_STATE_CLAIM_STATUS: Record<
  DisplayPreferenceKey,
  ExperimentContributorClaimStatus
> = {
  pending: "pending",
  accepted: "accepted",
  unclaimed: "declined",
};

const DISPLAY_MODE_OPTIONS: AttributionDisplayMode[] = [
  "orcid_only",
  "name_only",
  "name_and_avatar",
];

const AUTO_ACCEPT_OPTIONS: AutoAcceptMode[] = ["off", "all"];

function DetailsTooltip({ detail }: { detail: string }) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger>
        <span
          className="text-muted inline-flex cursor-default text-xs underline decoration-dotted underline-offset-2"
          tabIndex={0}
        >
          Details
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content className="tooltip-content-panel max-w-xs">
        {detail}
      </Tooltip.Content>
    </Tooltip>
  );
}

function RoleDefaultChip() {
  return (
    <Chip size="sm" variant="soft" color="accent">
      <span className="inline-flex items-center gap-1">
        <Lock className="size-3 shrink-0" aria-hidden />
        Role default
      </span>
    </Chip>
  );
}

function AttributionDisplayPreview({
  claimStatus,
  mode,
  prefs,
  profile,
  roleSlugs,
}: {
  claimStatus: ExperimentContributorClaimStatus;
  mode: AttributionDisplayMode;
  prefs: AttributionDisplayPreferences;
  profile: UserAttributionPreferencesView["profilePreview"];
  roleSlugs: readonly string[];
}) {
  const preferenceKey =
    claimStatus === "accepted"
      ? "accepted"
      : claimStatus === "pending"
        ? "pending"
        : "unclaimed";
  const resolved = resolveAttributionPublicDisplay({
    orcid: profile.orcid,
    claimStatus,
    storedDisplayName: profile.name,
    storedImageUrl: profile.image,
    targetPreferences: {
      autoAcceptMode: "off",
      displayPreferences: {
        ...prefs,
        [preferenceKey]: mode,
      },
    },
    targetRoleSlugs: roleSlugs,
  });

  return (
    <div className="border-border bg-surface-2 flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2">
      {resolved.showProfileImage ? (
        <ResearcherAvatar
          displayName={resolved.displayName ?? profile.name}
          imageUrl={resolved.imageUrl}
          identitySeed={profile.orcid}
          isAtlasProfile
          size="sm"
        />
      ) : (
        <ResearcherAvatar
          displayName={resolved.displayName ?? profile.orcid}
          identitySeed={profile.orcid}
          isAtlasProfile={Boolean(profile.name)}
          size="sm"
        />
      )}
      <span className="text-foreground min-w-0 truncate text-xs font-medium">
        {resolved.displayLabel}
      </span>
    </div>
  );
}

function DisplayPreferenceRow({
  preferenceKey,
  prefs,
  profile,
  roleManaged,
  prefsPending,
  onModeChange,
}: {
  preferenceKey: DisplayPreferenceKey;
  prefs: UserAttributionPreferencesView;
  profile: UserAttributionPreferencesView["profilePreview"];
  roleManaged: boolean;
  prefsPending: boolean;
  onModeChange: (
    key: DisplayPreferenceKey,
    mode: AttributionDisplayMode,
  ) => void;
}) {
  const mode = prefs.displayPreferences[preferenceKey];
  const claimStatus = DISPLAY_STATE_CLAIM_STATUS[preferenceKey];
  const roleSlugs = prefs.pendingDisplayManagedByRole
    ? (["administrator"] as const)
    : ([] as const);

  return (
    <div className="border-border flex h-full min-w-0 flex-col gap-3 rounded-lg border px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-foreground text-sm font-medium">
          {DISPLAY_STATE_LABELS[preferenceKey]}
        </Label>
        {roleManaged ? (
          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <span tabIndex={0}>
                <RoleDefaultChip />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content className="tooltip-content-panel max-w-xs">
              {PENDING_ROLE_DETAIL}
            </Tooltip.Content>
          </Tooltip>
        ) : (
          <>
            <DetailsTooltip detail={DISPLAY_STATE_DETAILS[preferenceKey]} />
            <Chip size="sm" variant="soft" color="default">
              {attributionDisplayModeLabel(mode)}
            </Chip>
          </>
        )}
      </div>
      <AttributionDisplayPreview
        claimStatus={claimStatus}
        mode={mode}
        prefs={prefs.displayPreferences}
        profile={profile}
        roleSlugs={roleSlugs}
      />
      {!roleManaged ? (
        <Select
          aria-label={`${DISPLAY_STATE_LABELS[preferenceKey]} display`}
          isDisabled={prefsPending}
          selectedKey={mode}
          onSelectionChange={(value) => {
            if (value == null) return;
            const next = String(
              Array.isArray(value) ? value[0] : value,
            ) as AttributionDisplayMode;
            onModeChange(preferenceKey, next);
          }}
        >
          <Select.Trigger className="border-border bg-surface min-h-9 w-full rounded-lg border shadow-none">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox
              aria-label={`${DISPLAY_STATE_LABELS[preferenceKey]} display options`}
            >
              {DISPLAY_MODE_OPTIONS.map((option) => (
                <ListBox.Item
                  id={option}
                  key={option}
                  textValue={attributionDisplayModeLabel(option)}
                >
                  {attributionDisplayModeLabel(option)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : null}
    </div>
  );
}

function AutoAcceptPreferenceRow({
  prefs,
  prefsPending,
  onModeChange,
}: {
  prefs: UserAttributionPreferencesView;
  prefsPending: boolean;
  onModeChange: (mode: AutoAcceptMode) => void;
}) {
  const mode = prefs.autoAcceptMode;
  const chipColor = mode === "all" ? "success" : "default";

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-foreground text-sm font-medium">
            Auto-accept new attributions
          </Label>
          <DetailsTooltip detail={AUTO_ACCEPT_DETAIL} />
          <Chip size="sm" variant="soft" color={chipColor}>
            {autoAcceptModeLabel(mode)}
          </Chip>
        </div>
      </div>
      <Select
        aria-label="Auto-accept new attributions"
        isDisabled={prefsPending}
        selectedKey={mode}
        className="sm:max-w-xs sm:shrink-0"
        onSelectionChange={(value) => {
          if (value == null) return;
          const next = String(
            Array.isArray(value) ? value[0] : value,
          ) as AutoAcceptMode;
          onModeChange(next);
        }}
      >
        <Select.Trigger className="border-border bg-surface min-h-9 w-full rounded-lg border shadow-none">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox aria-label="Auto-accept options">
            {AUTO_ACCEPT_OPTIONS.map((option) => (
              <ListBox.Item
                id={option}
                key={option}
                textValue={autoAcceptModeLabel(option)}
              >
                {autoAcceptModeLabel(option)}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

function formatDatasetLabel(row: {
  experiment: {
    moleculeName: string | null;
    edgeLabel: string;
    instrumentName: string;
    facilityName: string | null;
  };
}): string {
  const parts = [
    row.experiment.moleculeName ?? "Unknown molecule",
    row.experiment.edgeLabel,
    row.experiment.instrumentName,
  ];
  if (row.experiment.facilityName) {
    parts.push(row.experiment.facilityName);
  }
  return parts.join(" · ");
}

export function PendingAttributionsPage() {
  const utils = trpc.useUtils();
  const pendingQuery = trpc.datasetAttributions.listPendingForSession.useQuery();
  const prefsQuery = trpc.datasetAttributions.getPreferences.useQuery();
  const acceptMutation = trpc.datasetAttributions.acceptAttribution.useMutation();
  const declineMutation = trpc.datasetAttributions.declineAttribution.useMutation();
  const unclaimMutation = trpc.datasetAttributions.unclaimAttribution.useMutation();
  const setPrefsMutation = trpc.datasetAttributions.setPreferences.useMutation();
  const [busyContributorId, setBusyContributorId] = useState<string | null>(null);
  const [prefsExpanded, setPrefsExpanded] = useState(false);

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      utils.datasetAttributions.listPendingForSession.invalidate(),
      utils.datasetAttributions.countPendingForSession.invalidate(),
      utils.experiments.listMyUnclaimedContributions.invalidate(),
    ]);
  }, [utils]);

  const handleAccept = async (contributorId: string) => {
    setBusyContributorId(contributorId);
    try {
      await acceptMutation.mutateAsync({ contributorId });
      await invalidateAll();
      showToast("Attribution accepted", "success");
    } catch {
      showToast("Could not accept attribution", "error", 0);
    } finally {
      setBusyContributorId(null);
    }
  };

  const handleDecline = async (contributorId: string) => {
    setBusyContributorId(contributorId);
    try {
      await declineMutation.mutateAsync({ contributorId });
      await invalidateAll();
      showToast("Attribution declined; ORCID-only display remains", "success");
    } catch {
      showToast("Could not decline attribution", "error", 0);
    } finally {
      setBusyContributorId(null);
    }
  };

  const handleUnclaim = async (contributorId: string) => {
    setBusyContributorId(contributorId);
    try {
      await unclaimMutation.mutateAsync({ contributorId });
      await invalidateAll();
      showToast("Attribution unclaimed", "success");
    } catch {
      showToast("Could not unclaim attribution", "error", 0);
    } finally {
      setBusyContributorId(null);
    }
  };

  const savePreferences = async (
    next: Pick<UserAttributionPreferencesView, "autoAcceptMode" | "displayPreferences">,
  ) => {
    if (!prefsQuery.data) return;
    try {
      await setPrefsMutation.mutateAsync(next);
      await prefsQuery.refetch();
      showToast("Attribution preferences saved", "success");
    } catch {
      showToast("Could not save preferences", "error", 0);
    }
  };

  const handleDisplayModeChange = (
    key: DisplayPreferenceKey,
    mode: AttributionDisplayMode,
  ) => {
    if (!prefsQuery.data) return;
    if (key === "pending" && prefsQuery.data.pendingDisplayManagedByRole) {
      return;
    }
    void savePreferences({
      autoAcceptMode: prefsQuery.data.autoAcceptMode,
      displayPreferences: {
        ...prefsQuery.data.displayPreferences,
        [key]: mode,
      },
    });
  };

  const handleAutoAcceptChange = (mode: AutoAcceptMode) => {
    if (!prefsQuery.data) return;
    void savePreferences({
      autoAcceptMode: mode,
      displayPreferences: prefsQuery.data.displayPreferences,
    });
  };

  const isLoading = pendingQuery.isLoading || prefsQuery.isLoading;
  const rows = pendingQuery.data ?? [];
  const prefs = prefsQuery.data;

  const prefsSummary = prefs
    ? `${autoAcceptModeLabel(prefs.autoAcceptMode)} auto-accept · Pending ${attributionDisplayModeLabel(prefs.displayPreferences.pending)}`
    : "Loading preferences";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-semibold">
          Dataset attributions
        </h1>
        <p className="text-muted max-w-2xl text-sm">
          Review NEXAFS datasets where your ORCID is listed but you have not
          accepted credit. Until you accept, browse and contribute surfaces show
          your ORCID only unless you opt in below.
        </p>
      </div>

      <Accordion
        allowsMultipleExpanded
        variant="surface"
        aria-label="Attribution preferences"
        className="border-border w-full rounded-lg border"
        expandedKeys={
          prefsExpanded
            ? new Set([ATTRIBUTION_PREFERENCES_ACCORDION_ID])
            : new Set()
        }
        onExpandedChange={(keys) => {
          setPrefsExpanded(
            [...keys].map(String).includes(ATTRIBUTION_PREFERENCES_ACCORDION_ID),
          );
        }}
      >
        <Accordion.Item id={ATTRIBUTION_PREFERENCES_ACCORDION_ID}>
          <Accordion.Heading>
            <Accordion.Trigger className="flex w-full items-center gap-2 px-1 py-1 text-start">
              <span className="min-w-0 flex-1">
                <span className="text-foreground block text-base font-medium">
                  Attribution preferences
                </span>
                <span className="text-muted block truncate text-sm">
                  {prefsSummary}
                </span>
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="h-4 w-4" aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="flex flex-col gap-4 pt-0">
              {prefs ? (
                <>
                  <p className="text-muted text-sm">
                    Choose how your credit appears on dataset rows for each
                    claim state and whether new attributions are accepted
                    automatically.
                  </p>
                  <AutoAcceptPreferenceRow
                    prefs={prefs}
                    prefsPending={setPrefsMutation.isPending}
                    onModeChange={handleAutoAcceptChange}
                  />
                  <Separator />
                  <div className="flex flex-col gap-3">
                    <h3 className="text-foreground text-sm font-medium">
                      Profile display by claim state
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {DISPLAY_PREFERENCE_KEYS.map((key) => (
                          <DisplayPreferenceRow
                            key={key}
                            preferenceKey={key}
                            prefs={prefs}
                            profile={prefs.profilePreview}
                            roleManaged={
                              key === "pending" && prefs.pendingDisplayManagedByRole
                            }
                            prefsPending={setPrefsMutation.isPending}
                            onModeChange={handleDisplayModeChange}
                          />
                      ))}
                    </div>
                  </div>
                </>
              ) : prefsQuery.isLoading ? (
                <Spinner size="sm" aria-label="Loading preferences" />
              ) : null}
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <section className="flex flex-col gap-3">
        <h2 className="text-foreground text-lg font-medium">
          Pending review ({rows.length})
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner aria-label="Loading pending attributions" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted text-sm">
            No pending dataset attributions. When someone lists your ORCID on a
            NEXAFS dataset, it appears here.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const busy = busyContributorId === row.contributorId;
              return (
                <li key={row.contributorId}>
                  <Card className="border-border bg-surface border">
                    <Card.Content className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link
                          href={`/browse/nexafs?nexafsExperiment=${row.experimentId}`}
                          className="text-foreground hover:text-accent truncate font-medium transition-colors"
                        >
                          {formatDatasetLabel(row)}
                        </Link>
                        <p className="text-muted text-sm">
                          Role: {contributorRoleLabel(row.role)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => void handleAccept(row.contributorId)}
                          isDisabled={busy}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => void handleDecline(row.contributorId)}
                          isDisabled={busy}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => void handleUnclaim(row.contributorId)}
                          isDisabled={busy}
                        >
                          Unclaim
                        </Button>
                      </div>
                    </Card.Content>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
