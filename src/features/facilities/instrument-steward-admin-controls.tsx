"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "@heroui/react";
import { skipToken } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Badge,
  Button,
  Chip,
  ComboBox,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Spinner,
} from "@heroui/react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import { SimpleDialog } from "~/components/ui/dialog";
import {
  normalizeProfileImageUrl,
  ResearcherAvatar,
} from "~/components/ui/avatar";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "~/lib/attribution-researcher-search";
import {
  isValidOrcidUserId,
  normalizeOrcidUserInput,
  orcidUserIdSchema,
} from "~/lib/orcid";
import type { InstrumentStewardPublic } from "~/lib/instrument-steward";
import { instrumentStewardProfileHref } from "~/lib/instrument-steward";
import {
  researcherAttributionBadgeStatus,
  type ResearcherAttributionBadgeStatus,
} from "~/lib/nexafs-attribution";

type InstrumentStewardAdminControlsProps = {
  instrumentId: string;
  instrumentName: string;
  steward: InstrumentStewardPublic | null | undefined;
  onStewardChanged: () => void;
};

function badgeColorForStatus(
  status: ResearcherAttributionBadgeStatus,
): "danger" | "warning" | "success" {
  if (status === "unclaimed") return "danger";
  if (status === "pending_agreement") return "warning";
  return "success";
}

/**
 * Admin-only inline controls for assigning or clearing a beamline scientist steward on a facility instrument card.
 */
export function InstrumentStewardAdminControls({
  instrumentId,
  instrumentName,
  steward,
  onStewardChanged,
}: InstrumentStewardAdminControlsProps) {
  const { data: session } = useSession();
  const canManageUsers = Boolean(session?.user?.canManageUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedSearchKey, setSelectedSearchKey] = useState<Key | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const utils = trpc.useUtils();

  const setSteward = trpc.instruments.setSteward.useMutation({
    onSuccess: async () => {
      showToast(`Assigned steward for ${instrumentName}.`, "success");
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setSelectedSearchKey(null);
      await utils.instruments.listStewardsForFacility.invalidate();
      onStewardChanged();
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const clearSteward = trpc.instruments.clearSteward.useMutation({
    onSuccess: async () => {
      showToast(`Cleared steward for ${instrumentName}.`, "success");
      setClearConfirmOpen(false);
      await utils.instruments.listStewardsForFacility.invalidate();
      onStewardChanged();
    },
    onError: (error) => showToast(error.message, "error"),
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
    () => searchData?.results ?? [],
    [searchData?.results],
  );

  const assignOrcid = useCallback(
    (raw: string) => {
      const normalized = normalizeOrcidUserInput(raw);
      if (!normalized || !orcidUserIdSchema.safeParse(normalized).success) {
        showToast("Select a researcher or enter a valid ORCID iD.", "error");
        return;
      }
      setSteward.mutate({
        instrumentId,
        userId: normalized,
      });
    },
    [instrumentId, setSteward],
  );

  const resolveOrcidForAssign = useCallback((): string | null => {
    const candidates = [
      typeof selectedSearchKey === "string" ? selectedSearchKey : null,
      searchQuery,
    ];
    for (const raw of candidates) {
      const normalized = normalizeOrcidUserInput(raw ?? "");
      if (normalized && orcidUserIdSchema.safeParse(normalized).success) {
        return normalized;
      }
    }
    return null;
  }, [searchQuery, selectedSearchKey]);

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

  if (!canManageUsers) {
    return null;
  }

  const stewardTrimmedName = steward?.name?.trim() ?? "";
  const stewardDisplayName =
    stewardTrimmedName.length > 0
      ? stewardTrimmedName
      : (steward?.userId ?? "Unknown steward");
  const stewardHasAtlasProfile = Boolean(steward?.name?.trim());

  return (
    <>
      <div
        className="border-border bg-surface/60 mt-2 rounded-lg border px-3 py-3"
        aria-label={`Assign beamline scientist for ${instrumentName}`}
      >
        <p className="text-foreground text-xs font-semibold tracking-wide uppercase">
          Admin: beamline scientist
        </p>

        {steward ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <ResearcherAvatar
                displayName={stewardDisplayName}
                imageUrl={normalizeProfileImageUrl(steward.image)}
                identitySeed={steward.userId}
                isAtlasProfile={stewardHasAtlasProfile}
                placeholder={stewardHasAtlasProfile ? "initials" : "person"}
                size="sm"
                className="h-8 w-8 shrink-0"
              />
              <div className="min-w-0">
                <Link
                  href={instrumentStewardProfileHref(steward.userId)}
                  className="text-accent hover:text-accent-dark block truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {stewardDisplayName}
                </Link>
                <p className="text-muted font-mono text-xs tabular-nums">
                  {steward.userId}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => setClearConfirmOpen(true)}
              isDisabled={clearSteward.isPending}
            >
              Clear
            </Button>
          </div>
        ) : (
          <p className="text-muted mt-2 text-sm">No steward assigned.</p>
        )}

        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor={`steward-search-${instrumentId}`}>
            {steward ? "Reassign steward" : "Assign steward"}
          </Label>
          <ComboBox
            fullWidth
            aria-label={`Search researchers to assign steward for ${instrumentName}`}
            inputValue={searchQuery}
            onInputChange={(value) => {
              setSearchQuery(value);
              setSelectedSearchKey(null);
              const normalized = normalizeOrcidUserInput(value);
              if (isValidOrcidUserId(normalized)) {
                setSelectedSearchKey(normalized);
              }
            }}
            selectedKey={selectedSearchKey}
            onSelectionChange={(key) => {
              if (key == null || typeof key !== "string") return;
              const hit = searchResults.find((row) => row.orcid === key);
              if (!hit) return;
              setSelectedSearchKey(key);
              setSearchQuery(hit.displayName);
              assignOrcid(hit.orcid);
            }}
            items={searchResults}
            allowsEmptyCollection
          >
            <ComboBox.InputGroup>
              <Input
                id={`steward-search-${instrumentId}`}
                placeholder="Search by name, institution, or ORCID iD"
                autoComplete="off"
              />
              <ComboBox.Trigger />
            </ComboBox.InputGroup>
            <ComboBox.Popover>
              <ScrollShadow
                className="max-h-48 min-h-0"
                hideScrollBar
                orientation="vertical"
              >
                <ListBox
                  aria-label="Researcher search results"
                  renderEmptyState={() => (
                    <div className="text-muted px-3 py-2 text-xs">
                      {emptyStateMessage}
                    </div>
                  )}
                >
                  {searchResults.map((hit) => {
                    const status = researcherAttributionBadgeStatus({
                      isClaimed: hit.hasAtlasProfile,
                      hasContributionAgreement: hit.hasContributionAgreement,
                    });
                    return (
                      <ListBox.Item
                        key={hit.orcid}
                        id={hit.orcid}
                        textValue={`${hit.displayName} ${hit.orcid}`}
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
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    );
                  })}
                </ListBox>
              </ScrollShadow>
            </ComboBox.Popover>
          </ComboBox>
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
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              onPress={() => {
                const orcid = resolveOrcidForAssign();
                if (orcid) assignOrcid(orcid);
              }}
              isDisabled={!resolveOrcidForAssign() || setSteward.isPending}
            >
              Assign
            </Button>
          </div>
        </div>
      </div>

      <SimpleDialog
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="Clear beamline scientist"
      >
        <p className="text-muted text-sm">
          Remove {stewardDisplayName} as the steward for {instrumentName}? The
          public connector section will no longer show an assigned beamline
          scientist until a new steward is set.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onPress={() => setClearConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isDisabled={clearSteward.isPending}
            onPress={() => clearSteward.mutate({ instrumentId })}
          >
            Clear steward
          </Button>
        </div>
      </SimpleDialog>
    </>
  );
}
