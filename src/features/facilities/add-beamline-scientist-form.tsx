"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Key } from "react";
import { skipToken } from "@tanstack/react-query";
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
import { ResearcherAvatar } from "~/components/ui/avatar";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "~/lib/attribution-researcher-search";
import {
  buildOptimisticInstrumentSteward,
  mergeInstrumentStewardIntoFacilityMap,
  type InstrumentStewardPublic,
  type InstrumentStewardSearchHit,
} from "~/lib/instrument-steward";
import {
  researcherAttributionBadgeStatus,
  type ResearcherAttributionBadgeStatus,
} from "~/lib/nexafs-attribution";
import {
  normalizeOrcidUserInput,
  orcidUserIdSchema,
} from "~/lib/orcid";
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

/**
 * Search-and-add popover form for assigning beamline scientist stewards on facility cards.
 *
 * Picker rows call `instruments.addSteward` directly on list action; the parent popover stays
 * open until the mutation succeeds so optimistic cache updates can render the new avatar.
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
  const pendingSearchHitRef = useRef<InstrumentStewardSearchHit | null>(null);

  const utils = trpc.useUtils();
  const assignedUserIds = useMemo(
    () => new Set(stewards.map((row) => row.userId)),
    [stewards],
  );

  const addSteward = trpc.instruments.addSteward.useMutation({
    onMutate: async ({ userId }) => {
      await utils.instruments.listStewardsForFacility.cancel({ facilityId });
      const previous = utils.instruments.listStewardsForFacility.getData({
        facilityId,
      });
      const hit =
        pendingSearchHitRef.current ??
        ({
          orcid: userId,
          displayName: userId,
          imageUrl: null,
          hasAtlasProfile: false,
        } satisfies InstrumentStewardSearchHit);
      const optimisticSteward = buildOptimisticInstrumentSteward(
        instrumentId,
        hit,
      );
      if (previous) {
        utils.instruments.listStewardsForFacility.setData(
          { facilityId },
          mergeInstrumentStewardIntoFacilityMap(previous, optimisticSteward),
        );
      }
      return { previous };
    },
    onSuccess: (steward) => {
      utils.instruments.listStewardsForFacility.setData({ facilityId }, (current) =>
        mergeInstrumentStewardIntoFacilityMap(current ?? {}, steward),
      );
      showToast(`Added beamline scientist for ${instrumentName}.`, "success");
      setSearchQuery("");
      setDebouncedSearchQuery("");
      pendingSearchHitRef.current = null;
      onClose();
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        utils.instruments.listStewardsForFacility.setData(
          { facilityId },
          context.previous,
        );
      }
      pendingSearchHitRef.current = null;
      showToast(error.message, "error");
    },
    onSettled: () => {
      void utils.instruments.listStewardsForFacility.invalidate({ facilityId });
    },
  });

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

  const addSearchHit = useCallback(
    (hit: ResearcherSearchHit) => {
      if (addSteward.isPending) {
        return;
      }
      if (assignedUserIds.has(hit.orcid)) {
        showToast("That researcher is already a beamline scientist here.", "error");
        return;
      }
      pendingSearchHitRef.current = toStewardSearchHit(hit);
      addSteward.mutate({
        instrumentId,
        userId: hit.orcid,
      });
    },
    [addSteward, assignedUserIds, instrumentId],
  );

  const assignOrcid = useCallback(
    (raw: string, hit?: ResearcherSearchHit) => {
      if (addSteward.isPending) {
        return;
      }
      const normalized = normalizeOrcidUserInput(raw);
      if (!normalized || !orcidUserIdSchema.safeParse(normalized).success) {
        showToast("Select a researcher or enter a valid ORCID iD.", "error");
        return;
      }
      if (assignedUserIds.has(normalized)) {
        showToast("That researcher is already a beamline scientist here.", "error");
        return;
      }
      pendingSearchHitRef.current = hit
        ? toStewardSearchHit(hit)
        : {
            orcid: normalized,
            displayName: normalized,
            imageUrl: null,
            hasAtlasProfile: false,
          };
      addSteward.mutate({
        instrumentId,
        userId: normalized,
      });
    },
    [addSteward, assignedUserIds, instrumentId],
  );

  const resolveOrcidForAssign = useCallback((): string | null => {
    const normalized = normalizeOrcidUserInput(searchQuery);
    if (normalized && orcidUserIdSchema.safeParse(normalized).success) {
      return normalized;
    }
    return null;
  }, [searchQuery]);

  const emptyStateMessage = useMemo(() => {
    if (!searchQuery.trim()) {
      return "Search by name, institution, or ORCID iD.";
    }
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
    searchQuery,
  ]);

  const handleListBoxAction = useCallback(
    (key: Key) => {
      if (typeof key !== "string") return;
      const hit = searchResults.find((row) => row.orcid === key);
      if (!hit) return;
      addSearchHit(hit);
    },
    [addSearchHit, searchResults],
  );

  const resolvedOrcidForAssign = resolveOrcidForAssign();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-foreground text-sm font-medium">Add beamline scientist</p>
        <p className="text-muted mt-1 text-xs leading-snug">
          Search Atlas or ORCID, then pick a row to add them to {instrumentName}.
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
          disabled={addSteward.isPending}
        />
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
                return (
                  <ListBox.Item
                    id={hit.orcid}
                    textValue={`${hit.displayName} ${hit.orcid}`}
                    isDisabled={addSteward.isPending}
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
                    </div>
                  </ListBox.Item>
                );
              }}
            </ListBox>
          </ScrollShadow>
        </div>
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
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="ghost"
          onPress={onClose}
          isDisabled={addSteward.isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          variant="primary"
          onPress={() => {
            const orcid = resolveOrcidForAssign();
            if (!orcid) return;
            const hit = searchResults.find((row) => row.orcid === orcid);
            assignOrcid(orcid, hit);
          }}
          isDisabled={!resolvedOrcidForAssign || addSteward.isPending}
        >
          {addSteward.isPending ? "Adding..." : "Add"}
        </Button>
      </div>
    </div>
  );
}
