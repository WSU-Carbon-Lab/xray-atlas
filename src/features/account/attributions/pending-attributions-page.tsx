"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import {
  Accordion,
  Button,
  Card,
  Spinner,
} from "@heroui/react";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";
import {
  AttributionPreferencesForm,
  buildAttributionPreferencesSummary,
  useAttributionPreferences,
} from "~/features/account/attributions/attribution-preferences-panel";

const ATTRIBUTION_PREFERENCES_ACCORDION_ID = "attribution-preferences";

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
  const {
    prefs,
    isLoading: prefsLoading,
    isSaving,
    handleAutoAcceptChange,
    handleDisplayModeChange,
  } = useAttributionPreferences();
  const acceptMutation = trpc.datasetAttributions.acceptAttribution.useMutation();
  const declineMutation = trpc.datasetAttributions.declineAttribution.useMutation();
  const unclaimMutation = trpc.datasetAttributions.unclaimAttribution.useMutation();
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

  const isLoading = pendingQuery.isLoading || prefsLoading;
  const rows = pendingQuery.data ?? [];

  const prefsSummary = prefs
    ? buildAttributionPreferencesSummary(prefs)
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
        className="border-border w-full min-w-0 self-stretch rounded-lg border"
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
        <Accordion.Item
          id={ATTRIBUTION_PREFERENCES_ACCORDION_ID}
          className="w-full min-w-0"
        >
          <Accordion.Heading className="w-full min-w-0">
            <Accordion.Trigger className="hover:bg-default/50 flex w-full min-w-0 items-center gap-3 rounded-lg px-4 py-3 text-start transition-colors">
              <span className="min-w-0 flex-1">
                <span className="text-foreground block text-sm font-semibold">
                  Attribution preferences
                </span>
                <span className="text-muted block truncate text-xs">
                  {prefsSummary}
                </span>
              </span>
              <Accordion.Indicator className="text-muted shrink-0 [&>svg]:size-4">
                <ChevronDownIcon className="size-4" aria-hidden />
              </Accordion.Indicator>
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel className="w-full min-w-0">
            <Accordion.Body className="w-full min-w-0 px-4 pb-4 pt-0">
              {prefs ? (
                <div className="border-border flex w-full min-w-0 flex-col gap-4 border-t pt-4">
                  <AttributionPreferencesForm
                    prefs={prefs}
                    prefsPending={isSaving}
                    onAutoAcceptChange={handleAutoAcceptChange}
                    onDisplayModeChange={handleDisplayModeChange}
                  />
                </div>
              ) : prefsLoading ? (
                <div className="border-border border-t pt-4">
                  <Spinner size="sm" aria-label="Loading preferences" />
                </div>
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
