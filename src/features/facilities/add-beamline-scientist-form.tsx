"use client";

import { useCallback, useEffect, useMemo, useState, type Key } from "react";
import { skipToken } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import {
  Badge,
  Button,
  Chip,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Spinner,
} from "@heroui/react";
import { Check } from "lucide-react";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import { ResearcherAvatar } from "~/components/ui/avatar";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "~/lib/attribution-researcher-search";
import {
  buildOptimisticInstrumentSteward,
  instrumentStewardSearchHitsForAvatarDisplay,
  isInstrumentStewardSearchHitSelected,
  mergeInstrumentStewardIntoFacilityMap,
  mergeInstrumentStewardsIntoFacilityMap,
  toggleInstrumentStewardSearchHitSelection,
  type InstrumentStewardPublic,
  type InstrumentStewardSearchHit,
} from "~/lib/instrument-steward";
import {
  researcherAttributionBadgeStatus,
  type ResearcherAttributionBadgeStatus,
} from "~/lib/nexafs-attribution";
import type { ResearcherSearchHit } from "~/server/nexafs/searchResearchersForAttribution";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";

type AddBeamlineScientistFormProps = {
  facilityId: string;
  instrumentId: string;
  instrumentName: string;
  stewards: InstrumentStewardPublic[];
  onClose: () => void;
};

function badgeColorForStatus(
  status: ResearcherAttributionBadgeStatus,
): "danger" | "warning" | "success" {
  if (status === "unclaimed") return "danger";
  if (status === "pending_agreement") return "warning";
  return "success";
}

function toStewardSearchHit(hit: ResearcherSearchHit): InstrumentStewardSearchHit {
  return {
    orcid: hit.orcid,
    displayName: hit.displayName,
    imageUrl: hit.imageUrl,
    hasAtlasProfile: hit.hasAtlasProfile,
  };
}

function stewardAddErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof TRPCClientError) {
    return error.message.trim().length > 0 ? error.message : fallback;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

/**
 * Search-and-add popover form for assigning beamline scientist stewards on facility cards.
 *
 * Row picks accumulate in a pending list; the footer Add button commits all selections via
 * `instruments.addSteward` without closing the popover until commit succeeds or Cancel is pressed.
 */
export function AddBeamlineScientistForm({
  facilityId,
  instrumentId,
  instrumentName,
  stewards,
  onClose,
}: AddBeamlineScientistFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [pendingStewards, setPendingStewards] = useState<
    InstrumentStewardSearchHit[]
  >([]);
  const [isCommitting, setIsCommitting] = useState(false);

  const utils = trpc.useUtils();

  const assignedUserIds = useMemo(
    () => new Set(stewards.map((row) => row.userId)),
    [stewards],
  );

  const pendingOrcids = useMemo(
    () => new Set(pendingStewards.map((row) => row.orcid)),
    [pendingStewards],
  );

  const pendingAvatarUsers = useMemo(
    () => instrumentStewardSearchHitsForAvatarDisplay(pendingStewards),
    [pendingStewards],
  );

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchQuery(searchQuery.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchClassification = useMemo(
    () => classifyAttributionSearchQuery(debouncedSearchQuery),
    [debouncedSearchQuery],
  );

  const searchEnabled = isAttributionSearchQueryReady(
    searchClassification.mode,
    debouncedSearchQuery,
  );

  const {
    data: searchData,
    isFetching: isSearching,
    isError: searchFailed,
  } = trpc.users.searchForAttribution.useQuery(
    searchEnabled ? { query: debouncedSearchQuery, limit: 15 } : skipToken,
    { staleTime: 30_000, retry: false },
  );

  const searchResults = useMemo(
    () =>
      (searchData?.results ?? []).filter(
        (hit) => !assignedUserIds.has(hit.orcid),
      ),
    [assignedUserIds, searchData?.results],
  );

  const toggleSearchHit = useCallback(
    (hit: ResearcherSearchHit) => {
      if (isCommitting) {
        return;
      }
      if (assignedUserIds.has(hit.orcid)) {
        showToast(
          "That researcher is already a beamline scientist here.",
          "error",
        );
        return;
      }
      const stewardHit = toStewardSearchHit(hit);
      setPendingStewards((current) => {
        const wasSelected = isInstrumentStewardSearchHitSelected(
          current,
          stewardHit.orcid,
        );
        const next = toggleInstrumentStewardSearchHitSelection(
          current,
          stewardHit,
        );
        if (!wasSelected) {
          setSearchQuery("");
          setDebouncedSearchQuery("");
        }
        return next;
      });
    },
    [assignedUserIds, isCommitting],
  );

  const handleCommitPending = useCallback(async () => {
    if (pendingStewards.length === 0 || isCommitting) {
      return;
    }

    setIsCommitting(true);
    const hits = [...pendingStewards];

    await utils.instruments.listStewardsForFacility.cancel({ facilityId });
    const previous = utils.instruments.listStewardsForFacility.getData({
      facilityId,
    });
    const optimisticStewards = hits.map((hit) =>
      buildOptimisticInstrumentSteward(instrumentId, hit),
    );
    if (previous) {
      utils.instruments.listStewardsForFacility.setData(
        { facilityId },
        mergeInstrumentStewardsIntoFacilityMap(previous, optimisticStewards),
      );
    }

    const outcomes = await Promise.allSettled(
      hits.map((hit) =>
        utils.client.instruments.addSteward.mutate({
          instrumentId,
          userId: hit.orcid,
        }),
      ),
    );

    let cache = previous ?? {};
    const failedHits: InstrumentStewardSearchHit[] = [];
    let successCount = 0;
    let firstFailureReason: unknown = null;

    for (let index = 0; index < outcomes.length; index += 1) {
      const outcome = outcomes[index];
      const hit = hits[index];
      if (!outcome || !hit) {
        continue;
      }
      if (outcome.status === "fulfilled") {
        successCount += 1;
        cache = mergeInstrumentStewardIntoFacilityMap(cache, outcome.value);
      } else {
        failedHits.push(hit);
        if (firstFailureReason == null) {
          firstFailureReason = outcome.reason;
        }
      }
    }

    utils.instruments.listStewardsForFacility.setData({ facilityId }, cache);

    if (successCount === hits.length) {
      showToast(
        successCount === 1
          ? `Added beamline scientist for ${instrumentName}.`
          : `Added ${successCount} beamline scientists for ${instrumentName}.`,
        "success",
      );
      setPendingStewards([]);
      setSearchQuery("");
      setDebouncedSearchQuery("");
      onClose();
    } else if (successCount > 0) {
      setPendingStewards(failedHits);
      showToast(
        `Added ${successCount} of ${hits.length} beamline scientists. ${stewardAddErrorMessage(
          firstFailureReason,
          "Some researchers could not be added.",
        )}`,
        "error",
      );
    } else {
      if (previous) {
        utils.instruments.listStewardsForFacility.setData(
          { facilityId },
          previous,
        );
      }
      showToast(
        stewardAddErrorMessage(
          firstFailureReason,
          "Could not add beamline scientists.",
        ),
        "error",
      );
    }

    void utils.instruments.listStewardsForFacility.invalidate({ facilityId });
    setIsCommitting(false);
  }, [
    facilityId,
    instrumentId,
    instrumentName,
    isCommitting,
    onClose,
    pendingStewards,
    utils.client.instruments.addSteward,
    utils.instruments.listStewardsForFacility,
  ]);

  const handleCancel = useCallback(() => {
    if (isCommitting) {
      return;
    }
    setPendingStewards([]);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    onClose();
  }, [isCommitting, onClose]);

  const emptyStateMessage = useMemo(() => {
    if (!searchEnabled) {
      if (searchClassification.mode === "partial_orcid") {
        return "Enter at least 4 ORCID characters to search.";
      }
      return "Type at least 2 characters to search.";
    }
    if (isSearching) return "Searching...";
    if (searchFailed) return "Search failed. Try again.";
    if (searchClassification.mode === "full_orcid") {
      return "No ORCID record found for that iD.";
    }
    return "No matching researchers found.";
  }, [
    isSearching,
    searchClassification.mode,
    searchEnabled,
    searchFailed,
  ]);

  const handleListBoxAction = useCallback(
    (key: Key) => {
      if (typeof key !== "string") return;
      const hit = searchResults.find((row) => row.orcid === key);
      if (!hit) return;
      toggleSearchHit(hit);
    },
    [searchResults, toggleSearchHit],
  );

  const showResultsList = searchQuery.trim().length > 0;
  const commitDisabled = pendingStewards.length === 0 || isCommitting;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-foreground text-sm font-medium">Add beamline scientist</p>
        <p className="text-muted mt-1 text-xs leading-snug">
          Search Atlas or ORCID, select one or more researchers, then press Add for{" "}
          {instrumentName}.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`beamline-scientist-search-${instrumentId}`}>
          Researcher
        </Label>
        <Input
          id={`beamline-scientist-search-${instrumentId}`}
          aria-label={`Search researchers to add as beamline scientist for ${instrumentName}`}
          placeholder="Search by name, institution, or ORCID iD"
          autoComplete="off"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          disabled={isCommitting}
        />
        {showResultsList ? (
          <div
            className="border-border bg-surface overflow-hidden rounded-lg border"
            data-attribution-nested-overlay="true"
          >
            <ScrollShadow
              className="max-h-48 min-h-0"
              hideScrollBar
              orientation="vertical"
            >
              <ListBox
                aria-label="Researcher search results"
                items={searchEnabled ? searchResults : []}
                onAction={handleListBoxAction}
                selectionMode="none"
                renderEmptyState={() => (
                  <div className="text-muted px-3 py-2 text-xs">
                    {emptyStateMessage}
                  </div>
                )}
              >
                {(hit) => {
                  const status = researcherAttributionBadgeStatus({
                    isClaimed: hit.hasAtlasProfile,
                    hasContributionAgreement: hit.hasContributionAgreement,
                  });
                  const isSelected = pendingOrcids.has(hit.orcid);
                  return (
                    <ListBox.Item
                      id={hit.orcid}
                      textValue={`${hit.displayName} ${hit.orcid}`}
                      isDisabled={isCommitting}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Badge.Anchor className="shrink-0">
                          <ResearcherAvatar
                            displayName={hit.displayName}
                            imageUrl={hit.imageUrl}
                            identitySeed={hit.orcid}
                            isAtlasProfile={hit.hasAtlasProfile}
                            placeholder={
                              hit.hasAtlasProfile ? "initials" : "person"
                            }
                            size="sm"
                            className="h-8 w-8 shrink-0"
                          />
                          <Badge
                            color={badgeColorForStatus(status)}
                            size="sm"
                            placement="bottom-right"
                            className="size-2.5 min-h-0 min-w-0 rounded-full p-0"
                          />
                        </Badge.Anchor>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-foreground flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
                            <span className="truncate">{hit.displayName}</span>
                            {hit.hasAtlasProfile ? (
                              <Chip
                                size="sm"
                                variant="soft"
                                color="accent"
                                className="h-5 shrink-0 px-1.5 text-[10px]"
                              >
                                Atlas
                              </Chip>
                            ) : null}
                          </span>
                          <span className="text-muted font-mono text-xs tabular-nums">
                            {hit.orcid}
                          </span>
                          {hit.affiliation ? (
                            <span className="text-muted truncate text-xs">
                              {hit.affiliation}
                            </span>
                          ) : null}
                        </div>
                        {isSelected ? (
                          <Check
                            className="text-accent size-4 shrink-0"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                    </ListBox.Item>
                  );
                }}
              </ListBox>
            </ScrollShadow>
          </div>
        ) : null}
        {isSearching ? (
          <p className="text-muted flex items-center gap-1.5 text-xs">
            <Spinner size="sm" />
            Searching Atlas and ORCID...
          </p>
        ) : null}
        {searchData?.orcidSearchUnavailable ? (
          <p className="text-muted text-xs">
            ORCID registry search is temporarily unavailable; Atlas matches are
            still shown.
          </p>
        ) : null}
      </div>
      {pendingStewards.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-muted text-xs font-medium uppercase tracking-wide">
            Selected ({pendingStewards.length})
          </p>
          <ContributorAvatarGroup
            users={pendingAvatarUsers}
            size="sm"
            max={8}
          />
        </div>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onPress={handleCancel}
          isDisabled={isCommitting}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onPress={() => {
            void handleCommitPending();
          }}
          isDisabled={commitDisabled}
        >
          {isCommitting ? (
            <span className="flex items-center gap-1.5">
              <Spinner size="sm" />
              Adding...
            </span>
          ) : (
            `Add${pendingStewards.length > 0 ? ` (${pendingStewards.length})` : ""}`
          )}
        </Button>
      </div>
    </div>
  );
}
