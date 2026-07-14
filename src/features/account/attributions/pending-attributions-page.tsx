"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import {
  Accordion,
  Button,
  Card,
  Spinner,
  type Key,
} from "@heroui/react";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import { showToast } from "~/components/ui/toast";
import { SimpleDialog } from "~/components/ui/dialog";
import { trpc } from "~/trpc/client";
import {
  AttributionPreferencesForm,
  buildAttributionPreferencesSummary,
  useAttributionPreferences,
} from "~/features/account/attributions/attribution-preferences-panel";
import { finishPendingAttributionValidation } from "~/features/account/attributions/finish-pending-attribution-validation";
import { WelcomeAttributionIntro } from "~/features/account/attributions/welcome-attribution-intro";
import { site } from "~/app/brand";

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

export interface PendingAttributionsPageProps {
  /**
   * When true, shows first-login validation: ORCID account confirmation,
   * visibility preferences, and pending attribution review after ORCID account
   * creation redirected here because pending attributions already existed.
   */
  isFirstLoginWelcome?: boolean;
  /**
   * Originating post-login path restored after the user finishes validation.
   * Sourced from the Auth.js return-to cookie; falls back to `/` when absent.
   */
  returnTo?: string;
}

/**
 * Account surface for reviewing pending NEXAFS dataset attributions tied to the
 * session ORCID. Supports case-by-case accept/decline/unclaim and an explicit
 * bulk-accept action; never auto-accepts on login. On first-login welcome,
 * renders one identity/setup card (unified account/appearance confirm and
 * visibility preferences), then navigates back to the originating URL when
 * validation finishes. Non-welcome mode keeps preferences in a collapsible accordion.
 */
export function PendingAttributionsPage({
  isFirstLoginWelcome = false,
  returnTo = "/",
}: PendingAttributionsPageProps) {
  const router = useRouter();
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
  const acceptAllMutation =
    trpc.datasetAttributions.acceptAllPending.useMutation();
  const declineMutation = trpc.datasetAttributions.declineAttribution.useMutation();
  const unclaimMutation = trpc.datasetAttributions.unclaimAttribution.useMutation();
  const [busyContributorId, setBusyContributorId] = useState<string | null>(null);
  const [prefsExpandedKeys, setPrefsExpandedKeys] = useState<Set<Key>>(
    () => new Set<Key>(),
  );
  const [bulkAcceptOpen, setBulkAcceptOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      utils.datasetAttributions.listPendingForSession.invalidate(),
      utils.datasetAttributions.countPendingForSession.invalidate(),
      utils.experiments.listMyUnclaimedContributions.invalidate(),
    ]);
  }, [utils]);

  const navigateToOrigin = useCallback(async () => {
    if (finishing) {
      return;
    }
    setFinishing(true);
    try {
      const target = await finishPendingAttributionValidation(returnTo);
      router.replace(target);
    } catch {
      setFinishing(false);
      showToast("Could not continue to your destination", "error", 0);
      router.replace(returnTo.startsWith("/") ? returnTo : "/");
    }
  }, [finishing, returnTo, router]);

  const handleAccept = async (contributorId: string) => {
    setBusyContributorId(contributorId);
    try {
      await acceptMutation.mutateAsync({ contributorId });
      await invalidateAll();
      const remaining =
        await utils.datasetAttributions.listPendingForSession.fetch();
      showToast("Attribution accepted", "success");
      if (isFirstLoginWelcome && remaining.length === 0) {
        await navigateToOrigin();
      }
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

  const handleAcceptAll = async () => {
    setBulkBusy(true);
    try {
      const result = await acceptAllMutation.mutateAsync();
      await invalidateAll();
      setBulkAcceptOpen(false);
      if (result.acceptedCount === 0) {
        showToast("No pending attributions to accept", "success");
      } else {
        showToast(
          `Accepted ${result.acceptedCount} dataset attribution${result.acceptedCount === 1 ? "" : "s"}`,
          "success",
        );
      }
      if (isFirstLoginWelcome) {
        await navigateToOrigin();
      }
    } catch {
      showToast("Could not accept all attributions", "error", 0);
    } finally {
      setBulkBusy(false);
    }
  };

  const isLoading = pendingQuery.isLoading || prefsLoading;
  const rows = pendingQuery.data ?? [];
  const anyRowBusy = busyContributorId != null || bulkBusy || finishing;

  const prefsSummary = prefs
    ? buildAttributionPreferencesSummary(prefs)
    : "Loading preferences";

  const handleAccountConfirmed = useCallback(() => {
    void utils.datasetAttributions.getPreferences.invalidate();
  }, [utils]);

  return (
    <div className="flex flex-col gap-8">
      {isFirstLoginWelcome ? (
        prefs ? (
          <WelcomeAttributionIntro
            prefs={prefs}
            prefsPending={isSaving}
            onAutoAcceptChange={handleAutoAcceptChange}
            onDisplayModeChange={handleDisplayModeChange}
            onAccountConfirmed={handleAccountConfirmed}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-2xl font-semibold">
              Welcome to {site.name}
            </h1>
            <p className="text-muted max-w-2xl text-sm">
              Loading your account and attribution preferences…
            </p>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-2xl font-semibold">
              Dataset attributions
            </h1>
            <p className="text-muted max-w-2xl text-sm">
              Review NEXAFS datasets where your ORCID is listed but you have not
              accepted credit. Until you accept, browse and contribute surfaces
              show your ORCID only unless you opt in below.
            </p>
          </div>

          <Accordion
            allowsMultipleExpanded
            variant="surface"
            aria-label="Attribution preferences"
            className="border-border w-full min-w-0 self-stretch rounded-lg border"
            expandedKeys={prefsExpandedKeys}
            onExpandedChange={setPrefsExpandedKeys}
          >
            <Accordion.Item
              key={ATTRIBUTION_PREFERENCES_ACCORDION_ID}
              id={ATTRIBUTION_PREFERENCES_ACCORDION_ID}
              className="w-full min-w-0"
            >
              <Accordion.Heading className="w-full min-w-0">
                <Accordion.Trigger className="hover:bg-default/50 flex w-full min-w-0 items-center gap-3 rounded-lg px-4 py-3 text-start transition-colors">
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block text-sm font-semibold">
                      Attribution visibility preferences
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
        </>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-foreground text-lg font-medium">
            Pending attributions ({rows.length})
          </h2>
          {rows.length > 1 ? (
            <Button
              size="sm"
              variant="primary"
              onPress={() => setBulkAcceptOpen(true)}
              isDisabled={anyRowBusy || isLoading}
            >
              Accept all
            </Button>
          ) : null}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner aria-label="Loading pending attributions" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted text-sm">
            {isFirstLoginWelcome
              ? "No pending dataset attributions for your ORCID. You can continue to where you started."
              : "No pending dataset attributions. When someone lists your ORCID on a NEXAFS dataset, it appears here."}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => {
              const busy = busyContributorId === row.contributorId || bulkBusy;
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
                          isDisabled={busy || finishing}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() => void handleDecline(row.contributorId)}
                          isDisabled={busy || finishing}
                        >
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => void handleUnclaim(row.contributorId)}
                          isDisabled={busy || finishing}
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

      {isFirstLoginWelcome ? (
        <div className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-sm">
            {rows.length === 0
              ? "You can leave pending items for later from your account menu."
              : "You can finish now and review remaining attributions later from your account menu."}
          </p>
          <Button
            size="sm"
            variant="primary"
            onPress={() => void navigateToOrigin()}
            isDisabled={finishing || anyRowBusy}
          >
            {finishing ? "Continuing…" : "Continue"}
          </Button>
        </div>
      ) : null}

      <SimpleDialog
        isOpen={bulkAcceptOpen}
        onClose={() => {
          if (!bulkBusy) {
            setBulkAcceptOpen(false);
          }
        }}
        title="Accept all pending attributions"
      >
        <div className="flex flex-col gap-4">
          <p className="text-muted text-sm">
            Accept credit on all {rows.length} pending dataset
            {rows.length === 1 ? "" : "s"} listed for your ORCID? This does not
            change your auto-accept preference for future attributions.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setBulkAcceptOpen(false)}
              isDisabled={bulkBusy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              onPress={() => void handleAcceptAll()}
              isDisabled={bulkBusy}
            >
              {bulkBusy ? "Accepting…" : "Accept all"}
            </Button>
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
