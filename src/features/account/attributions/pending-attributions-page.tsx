"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Button,
  Card,
  Label,
  Separator,
  Spinner,
  Switch,
} from "@heroui/react";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import type { UserAttributionPreferencesView } from "~/lib/dataset-attribution-claim";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";

const ROLE_MANAGED_PREFS_HELPER =
  "Fixed for administrators and maintainers.";

type AttributionPreferenceKey =
  | "showNameOnPendingAttributions"
  | "autoAcceptAttributions";

function AttributionPreferenceRow({
  preferenceKey,
  label,
  description,
  prefs,
  prefsPending,
  onChange,
}: {
  preferenceKey: AttributionPreferenceKey;
  label: string;
  description: string;
  prefs: UserAttributionPreferencesView;
  prefsPending: boolean;
  onChange: (key: AttributionPreferenceKey, value: boolean) => void;
}) {
  const roleManaged = prefs.managedByLineageRole;
  const hintId = `attribution-pref-${preferenceKey}-role-hint`;
  const isSelected = prefs[preferenceKey];
  const switchDisabled = roleManaged || prefsPending;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Label>{label}</Label>
        <p className="text-muted text-sm">{description}</p>
        {roleManaged ? (
          <p id={hintId} className="text-muted text-sm">
            {ROLE_MANAGED_PREFS_HELPER}
          </p>
        ) : null}
      </div>
      <Switch
        isSelected={isSelected}
        onChange={(selected) => onChange(preferenceKey, selected)}
        isDisabled={switchDisabled}
        aria-label={label}
        aria-disabled={switchDisabled}
        aria-describedby={roleManaged ? hintId : undefined}
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
    if (!prefsQuery.data || prefsQuery.data.managedByLineageRole) return;
    try {
      await setPrefsMutation.mutateAsync({
        showNameOnPendingAttributions:
          prefsQuery.data.showNameOnPendingAttributions,
        autoAcceptAttributions: prefsQuery.data.autoAcceptAttributions,
        [key]: value,
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
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 px-4 pb-4">
          {prefsQuery.data ? (
            <>
              {prefsQuery.data.managedByLineageRole ? (
                <p className="text-muted text-sm">
                  Your administrator or maintainer role sets how pending
                  attributions appear on browse and contribute surfaces; the
                  toggles below reflect that policy and cannot be changed here.
                </p>
              ) : null}
              <AttributionPreferenceRow
                preferenceKey="showNameOnPendingAttributions"
                label="Show name on pending attributions"
                description={
                  prefsQuery.data.managedByLineageRole
                    ? "Your name and profile image appear on pending attributions by role policy."
                    : "Display your name (not your photo) on datasets you have not accepted yet."
                }
                prefs={prefsQuery.data}
                prefsPending={setPrefsMutation.isPending}
                onChange={(key, value) => void handlePrefChange(key, value)}
              />
              <Separator />
              <AttributionPreferenceRow
                preferenceKey="autoAcceptAttributions"
                label="Auto-accept new attributions"
                description="Automatically accept future dataset attributions assigned to your ORCID."
                prefs={prefsQuery.data}
                prefsPending={setPrefsMutation.isPending}
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
