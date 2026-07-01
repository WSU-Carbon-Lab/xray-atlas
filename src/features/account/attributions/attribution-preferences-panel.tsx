"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Chip,
  Label,
  ListBox,
  Select,
  Separator,
  Spinner,
  Tooltip,
} from "@heroui/react";
import {
  attributionDisplayModeLabel,
  attributionResearcherAvatarProps,
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

const PENDING_ROLE_SUMMARY =
  "Name and profile on pending attributions are fixed by your role.";

const PENDING_ROLE_TOOLTIP =
  "Administrators and maintainers always show name and profile on pending attributions. This preference is set by your role and cannot be changed here.";

export type AttributionDisplayPreferenceKey = keyof AttributionDisplayPreferences;

const DISPLAY_STATE_LABELS: Record<AttributionDisplayPreferenceKey, string> = {
  pending: "Pending",
  accepted: "Accepted",
  unclaimed: "Unclaimed or declined",
};

export const ATTRIBUTION_DISPLAY_PREFERENCE_KEYS: AttributionDisplayPreferenceKey[] =
  ["pending", "accepted", "unclaimed"];

const DISPLAY_STATE_CLAIM_STATUS: Record<
  AttributionDisplayPreferenceKey,
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

const preferenceSelectTriggerClassName =
  "border-border bg-surface min-h-10 w-full min-w-0 rounded-lg border shadow-none";

/**
 * Builds a compact one-line summary of auto-accept and pending display settings.
 */
export function buildAttributionPreferencesSummary(
  prefs: UserAttributionPreferencesView,
): string {
  return `${autoAcceptModeLabel(prefs.autoAcceptMode)} auto-accept · Pending ${attributionDisplayModeLabel(prefs.displayPreferences.pending)}`;
}

function RoleDefaultLockedControl() {
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="block w-full min-w-0">
        <div
          tabIndex={0}
          className={`${preferenceSelectTriggerClassName} text-muted flex cursor-not-allowed items-center px-3`}
          aria-disabled="true"
          aria-label="Role default display mode"
        >
          <Chip size="sm" variant="soft" color="accent">
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3 shrink-0" aria-hidden />
              Role default
            </span>
          </Chip>
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content className="tooltip-content-panel max-w-xs">
        {PENDING_ROLE_TOOLTIP}
      </Tooltip.Content>
    </Tooltip>
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
  const orcid = profile.orcid;
  const resolved = resolveAttributionPublicDisplay({
    orcid,
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
  const avatarProps = attributionResearcherAvatarProps({ orcid, resolved });

  return (
    <div
      className="bg-surface-2/40 flex min-h-9 min-w-0 items-center gap-2 rounded-md px-2 py-1.5"
      aria-hidden
    >
      <ResearcherAvatar
        displayName={avatarProps.displayName}
        imageUrl={avatarProps.imageUrl}
        identitySeed={orcid}
        isAtlasProfile={avatarProps.isAtlasProfile}
        placeholder={avatarProps.placeholder}
        size="sm"
        className="shrink-0"
      />
      {avatarProps.isOrcidOnlyDisplay ? (
        <span className="text-muted min-w-0 truncate font-mono text-xs tabular-nums">
          {orcid}
        </span>
      ) : (
        <span className="text-foreground min-w-0 truncate text-xs font-medium">
          {resolved.displayLabel}
        </span>
      )}
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
  preferenceKey: AttributionDisplayPreferenceKey;
  prefs: UserAttributionPreferencesView;
  profile: UserAttributionPreferencesView["profilePreview"];
  roleManaged: boolean;
  prefsPending: boolean;
  onModeChange: (
    key: AttributionDisplayPreferenceKey,
    mode: AttributionDisplayMode,
  ) => void;
}) {
  const mode = prefs.displayPreferences[preferenceKey];
  const [previewMode, setPreviewMode] = useState(mode);
  useEffect(() => {
    setPreviewMode(mode);
  }, [mode]);
  const claimStatus = DISPLAY_STATE_CLAIM_STATUS[preferenceKey];
  const roleSlugs = prefs.pendingDisplayManagedByRole
    ? (["administrator"] as const)
    : ([] as const);

  const selectId = `attribution-display-${preferenceKey}`;

  return (
    <div className="border-border flex h-full min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <Label
          htmlFor={roleManaged ? undefined : selectId}
          className="text-foreground text-sm font-medium"
        >
          {DISPLAY_STATE_LABELS[preferenceKey]}
        </Label>
        <p className="text-muted mt-0.5 text-xs leading-snug">
          {roleManaged
            ? PENDING_ROLE_SUMMARY
            : DISPLAY_STATE_DETAILS[preferenceKey]}
        </p>
      </div>
      <AttributionDisplayPreview
        claimStatus={claimStatus}
        mode={previewMode}
        prefs={prefs.displayPreferences}
        profile={profile}
        roleSlugs={roleSlugs}
      />
      {roleManaged ? (
        <div className="mt-auto w-full min-w-0">
          <RoleDefaultLockedControl />
        </div>
      ) : (
        <Select
          id={selectId}
          aria-label={`${DISPLAY_STATE_LABELS[preferenceKey]} display`}
          isDisabled={prefsPending}
          selectedKey={mode}
          fullWidth
          className="mt-auto w-full min-w-0"
          onSelectionChange={(value) => {
            if (value == null) return;
            const next = String(
              Array.isArray(value) ? value[0] : value,
            ) as AttributionDisplayMode;
            setPreviewMode(next);
            onModeChange(preferenceKey, next);
          }}
        >
          <Select.Trigger className={preferenceSelectTriggerClassName}>
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
      )}
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
  const selectId = "attribution-auto-accept";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <Label htmlFor={selectId} className="text-foreground text-sm font-medium">
          Auto-accept new attributions
        </Label>
        <p className="text-muted mt-0.5 text-xs leading-snug">
          {AUTO_ACCEPT_DETAIL}
        </p>
      </div>
      <Select
        id={selectId}
        aria-label="Auto-accept new attributions"
        isDisabled={prefsPending}
        selectedKey={mode}
        className="w-full sm:w-48 sm:shrink-0"
        onSelectionChange={(value) => {
          if (value == null) return;
          const next = String(
            Array.isArray(value) ? value[0] : value,
          ) as AutoAcceptMode;
          onModeChange(next);
        }}
      >
        <Select.Trigger className={preferenceSelectTriggerClassName}>
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

/**
 * Loads and persists dataset attribution display preferences for the signed-in user.
 */
export function useAttributionPreferences() {
  const prefsQuery = trpc.datasetAttributions.getPreferences.useQuery();
  const setPrefsMutation = trpc.datasetAttributions.setPreferences.useMutation();

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
    key: AttributionDisplayPreferenceKey,
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

  return {
    prefs: prefsQuery.data,
    isLoading: prefsQuery.isLoading,
    isSaving: setPrefsMutation.isPending,
    handleAutoAcceptChange,
    handleDisplayModeChange,
  };
}

/**
 * Renders auto-accept and per-claim-state attribution display controls with live previews.
 */
export function AttributionPreferencesForm({
  prefs,
  prefsPending,
  onAutoAcceptChange,
  onDisplayModeChange,
}: {
  prefs: UserAttributionPreferencesView;
  prefsPending: boolean;
  onAutoAcceptChange: (mode: AutoAcceptMode) => void;
  onDisplayModeChange: (
    key: AttributionDisplayPreferenceKey,
    mode: AttributionDisplayMode,
  ) => void;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <AutoAcceptPreferenceRow
        prefs={prefs}
        prefsPending={prefsPending}
        onModeChange={onAutoAcceptChange}
      />
      <Separator />
      <section
        aria-labelledby="attribution-display-by-state"
        className="flex w-full min-w-0 flex-col gap-3"
      >
        <h3
          id="attribution-display-by-state"
          className="text-foreground text-sm font-medium"
        >
          Profile display by claim state
        </h3>
        <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
          {ATTRIBUTION_DISPLAY_PREFERENCE_KEYS.map((key) => (
            <DisplayPreferenceRow
              key={key}
              preferenceKey={key}
              prefs={prefs}
              profile={prefs.profilePreview}
              roleManaged={key === "pending" && prefs.pendingDisplayManagedByRole}
              prefsPending={prefsPending}
              onModeChange={onDisplayModeChange}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Profile contributions card for attribution visibility and auto-accept settings.
 */
export function ProfileAttributionPreferencesSection() {
  const {
    prefs,
    isLoading,
    isSaving,
    handleAutoAcceptChange,
    handleDisplayModeChange,
  } = useAttributionPreferences();

  const summary = prefs ? buildAttributionPreferencesSummary(prefs) : null;

  return (
    <section aria-labelledby="profile-attribution-preferences-heading" className="mb-10">
      <div className="border-border bg-surface rounded-xl border">
        <div className="border-border flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2
              id="profile-attribution-preferences-heading"
              className="text-foreground text-base font-semibold"
            >
              Attribution preferences
            </h2>
            <p className="text-muted mt-1 text-sm">
              Control how your name appears on NEXAFS datasets before and after you
              accept credit, and whether new attributions are accepted automatically.
            </p>
            {summary ? (
              <p className="text-muted mt-2 text-xs">{summary}</p>
            ) : null}
          </div>
          <Link
            href="/account/attributions/pending"
            className="border-border bg-surface text-foreground hover:bg-surface-2 inline-flex shrink-0 self-start items-center rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Review pending
          </Link>
        </div>
        <div className="p-5">
          {isLoading ? (
            <Spinner size="sm" aria-label="Loading attribution preferences" />
          ) : prefs ? (
            <AttributionPreferencesForm
              prefs={prefs}
              prefsPending={isSaving}
              onAutoAcceptChange={handleAutoAcceptChange}
              onDisplayModeChange={handleDisplayModeChange}
            />
          ) : (
            <p className="text-muted text-sm">
              Attribution preferences could not be loaded.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
