"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import {
  Button,
  Card,
  Chip,
  Label,
  Separator,
  Spinner,
  Switch,
  Tooltip,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import type { UserAttributionPreferencesView } from "~/lib/dataset-attribution-claim";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";

type AttributionPreferenceKey =
  | "showNameOnPendingAttributions"
  | "autoAcceptAttributions";

const SHOW_NAME_DETAIL =
  "Display your name on datasets you have not accepted yet. Profile image appears when your role policy allows it on pending attributions.";

const SHOW_NAME_ROLE_DETAIL =
  "Administrators and maintainers always show name and profile on pending attributions. This preference is set by your role and cannot be turned off here.";

const AUTO_ACCEPT_DETAIL =
  "Automatically accept future dataset attributions assigned to your ORCID. You can change this at any time.";

function preferenceStatusChip(
  isSelected: boolean,
  roleManaged: boolean,
): { label: string; color: "accent" | "default" | "success" } {
  if (roleManaged) {
    return { label: "Role default", color: "accent" };
  }
  if (isSelected) {
    return { label: "On", color: "success" };
  }
  return { label: "Off", color: "default" };
}

function autoAcceptStatusChip(
  isSelected: boolean,
): { label: string; color: "default" | "success" } {
  if (isSelected) {
    return { label: "Enabled", color: "success" };
  }
  return { label: "Off", color: "default" };
}

function AttributionPreferenceRow({
  preferenceKey,
  label,
  detail,
  prefs,
  prefsPending,
  roleManaged,
  onChange,
}: {
  preferenceKey: AttributionPreferenceKey;
  label: string;
  detail: string;
  prefs: UserAttributionPreferencesView;
  prefsPending: boolean;
  roleManaged: boolean;
  onChange: (key: AttributionPreferenceKey, value: boolean) => void;
}) {
  const isSelected = prefs[preferenceKey];
  const switchDisabled = roleManaged || prefsPending;
  const chip =
    preferenceKey === "autoAcceptAttributions"
      ? autoAcceptStatusChip(isSelected)
      : preferenceStatusChip(isSelected, roleManaged);

  return (
    <div className="border-border flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-foreground text-sm font-medium">{label}</Label>
          {roleManaged ? (
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <span
                  className="text-muted inline-flex shrink-0"
                  aria-label="Set by administrator or maintainer role"
                >
                  <Lock className="size-4" aria-hidden />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content className="tooltip-content-panel max-w-xs">
                {SHOW_NAME_ROLE_DETAIL}
              </Tooltip.Content>
            </Tooltip>
          ) : (
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
          )}
          <Chip size="sm" variant="soft" color={chip.color}>
            {chip.label}
          </Chip>
        </div>
      </div>
      <Switch
        isSelected={isSelected}
        onChange={(selected) => onChange(preferenceKey, selected)}
        isDisabled={switchDisabled}
        aria-label={label}
        aria-disabled={switchDisabled}
        className={cn(roleManaged && "opacity-90")}
      />
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

  const handlePrefChange = async (
    key: AttributionPreferenceKey,
    value: boolean,
  ) => {
    if (!prefsQuery.data) return;
    if (
      key === "showNameOnPendingAttributions" &&
      prefsQuery.data.showNameOnPendingManagedByRole
    ) {
      return;
    }
    try {
      await setPrefsMutation.mutateAsync({
        showNameOnPendingAttributions:
          prefsQuery.data.showNameOnPendingManagedByRole
            ? true
            : key === "showNameOnPendingAttributions"
              ? value
              : prefsQuery.data.showNameOnPendingAttributions,
        autoAcceptAttributions:
          key === "autoAcceptAttributions"
            ? value
            : prefsQuery.data.autoAcceptAttributions,
      });
      await prefsQuery.refetch();
      showToast("Attribution preferences saved", "success");
    } catch {
      showToast("Could not save preferences", "error", 0);
    }
  };

  const isLoading = pendingQuery.isLoading || prefsQuery.isLoading;
  const rows = pendingQuery.data ?? [];

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

      <Card className="border-border bg-surface border">
        <Card.Header className="px-4 py-3">
          <Card.Title className="text-base font-medium">
            Attribution preferences
          </Card.Title>
          <Card.Description className="text-muted text-sm">
            Control how pending credits appear and whether new attributions are
            accepted automatically.
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 px-4 pb-4">
          {prefsQuery.data ? (
            <>
              <AttributionPreferenceRow
                preferenceKey="showNameOnPendingAttributions"
                label="Show name on pending attributions"
                detail={SHOW_NAME_DETAIL}
                prefs={prefsQuery.data}
                prefsPending={setPrefsMutation.isPending}
                roleManaged={prefsQuery.data.showNameOnPendingManagedByRole}
                onChange={(key, value) => void handlePrefChange(key, value)}
              />
              <Separator />
              <AttributionPreferenceRow
                preferenceKey="autoAcceptAttributions"
                label="Auto-accept new attributions"
                detail={AUTO_ACCEPT_DETAIL}
                prefs={prefsQuery.data}
                prefsPending={setPrefsMutation.isPending}
                roleManaged={false}
                onChange={(key, value) => void handlePrefChange(key, value)}
              />
            </>
          ) : prefsQuery.isLoading ? (
            <Spinner size="sm" aria-label="Loading preferences" />
          ) : null}
        </Card.Content>
      </Card>

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
