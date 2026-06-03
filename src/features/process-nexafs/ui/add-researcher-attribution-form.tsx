"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "@heroui/react";
import { skipToken } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Chip,
  ComboBox,
  ErrorMessage,
  Input,
  Label,
  Header,
  ListBox,
  ScrollShadow,
  Select,
  Separator,
  Spinner,
} from "@heroui/react";
import {
  normalizeProfileImageUrl,
  ResearcherAvatar,
} from "~/components/ui/avatar";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "~/lib/attribution-researcher-search";
import {
  groupContributorRoleOptionsByTier,
  listAttributionRoleOptions,
  researcherAttributionBadgeStatus,
  type AttributionRoleOption,
  type DatasetAttributionEntry,
  type ResearcherAttributionBadgeStatus,
} from "~/lib/nexafs-attribution";
import {
  contributorRoleLabel,
  isUploaderContributorRole,
  type DataCiteContributorType,
} from "~/lib/datacite-contributor-types";
import {
  isValidOrcidUserId,
  normalizeOrcidUserInput,
  orcidUserIdSchema,
} from "~/lib/orcid";
import { trpc } from "~/trpc/client";

type AddResearcherAttributionFormProps = {
  validAttributions: DatasetAttributionEntry[];
  onAppendAttribution: (entry: DatasetAttributionEntry) => void;
  onClose: () => void;
};

function attributionRowKey(row: DatasetAttributionEntry): string {
  return `${row.orcid}:${row.role}`;
}

function badgeColorForStatus(
  status: ResearcherAttributionBadgeStatus,
): "danger" | "warning" | "success" {
  if (status === "unclaimed") return "danger";
  if (status === "pending_agreement") return "warning";
  return "success";
}

function AttributionRoleListItem({ option }: { option: AttributionRoleOption }) {
  return (
    <ListBox.Item
      id={option.contributorType}
      textValue={`${option.label} ${option.subtitle ?? ""} ${option.description}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5 py-0.5">
        <span className="text-foreground flex flex-wrap items-center gap-1.5 font-medium">
          <span>{option.label}</span>
          {option.subtitle ? (
            <span className="text-muted text-xs font-normal">{option.subtitle}</span>
          ) : null}
          {option.requiredAtUpload ? (
            <Chip
              size="sm"
              variant="soft"
              color="accent"
              className="h-5 shrink-0 px-1.5 text-[10px]"
            >
              Required at upload
            </Chip>
          ) : null}
        </span>
        <span className="text-muted text-xs leading-snug">{option.description}</span>
      </div>
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

export function AddResearcherAttributionForm({
  validAttributions,
  onAppendAttribution,
  onClose,
}: AddResearcherAttributionFormProps) {
  const roleOptions = useMemo(() => listAttributionRoleOptions(), []);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [orcidDraft, setOrcidDraft] = useState("");
  const [roleDraft, setRoleDraft] =
    useState<DataCiteContributorType>("DataCollector");
  const [orcidError, setOrcidError] = useState<string | null>(null);
  const [lookupOrcid, setLookupOrcid] = useState<string | null>(null);
  const [selectedSearchKey, setSelectedSearchKey] = useState<Key | null>(null);

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
    searchEnabled
      ? { query: debouncedSearchQuery, limit: 15 }
      : skipToken,
    { staleTime: 30_000, retry: false },
  );

  const searchResults = useMemo(
    () => searchData?.results ?? [],
    [searchData?.results],
  );

  const { data: resolvedUser, isFetching: isResolving } =
    trpc.users.getById.useQuery(
      lookupOrcid ? { id: lookupOrcid } : skipToken,
      { retry: false },
    );

  const applyOrcidSelection = useCallback(
    (orcid: string, displayName?: string | null) => {
      const normalized = normalizeOrcidUserInput(orcid);
      if (!isValidOrcidUserId(normalized)) {
        setOrcidError("Invalid ORCID format (expected XXXX-XXXX-XXXX-XXXX)");
        setLookupOrcid(null);
        return;
      }
      setOrcidDraft(normalized);
      setLookupOrcid(normalized);
      setOrcidError(null);
      if (displayName) {
        setSearchQuery(displayName);
      }
    },
    [],
  );

  useEffect(() => {
    if (searchClassification.mode !== "full_orcid") return;
    if (!searchClassification.normalizedOrcid) return;
    if (searchResults.length !== 1) return;
    const hit = searchResults[0];
    if (hit?.orcid !== searchClassification.normalizedOrcid) return;
    if (lookupOrcid === hit.orcid) return;
    setSelectedSearchKey(hit.orcid);
    applyOrcidSelection(hit.orcid, hit.displayName);
  }, [
    applyOrcidSelection,
    lookupOrcid,
    searchClassification.mode,
    searchClassification.normalizedOrcid,
    searchResults,
  ]);

  const resolveOrcidForAdd = useCallback((): string | null => {
    const candidates = [
      orcidDraft,
      lookupOrcid,
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
  }, [lookupOrcid, orcidDraft, searchQuery, selectedSearchKey]);

  const handleAdd = useCallback((): boolean => {
    const orcid = resolveOrcidForAdd();
    if (!orcid) {
      setOrcidError(
        "Select a researcher from the list or enter a valid ORCID iD",
      );
      return false;
    }

    const key = `${orcid}:${roleDraft}`;
    if (validAttributions.some((row) => attributionRowKey(row) === key)) {
      setOrcidError("This person already has that role on the dataset");
      return false;
    }
    if (isUploaderContributorRole(roleDraft)) {
      const existingUploader = validAttributions.find((row) =>
        isUploaderContributorRole(row.role),
      );
      if (existingUploader && existingUploader.orcid !== orcid) {
        setOrcidError("Only one data curator (uploader) is allowed per dataset");
        return false;
      }
    }

    const matchedSearch = searchResults.find((hit) => hit.orcid === orcid);
    const hasAtlasProfile = Boolean(
      resolvedUser ?? matchedSearch?.hasAtlasProfile,
    );
    const hasContributionAgreement = hasAtlasProfile
      ? (matchedSearch?.hasContributionAgreement ??
        resolvedUser?.hasContributionAgreement ??
        false)
      : false;

    const imageUrl = normalizeProfileImageUrl(
      resolvedUser?.image ?? matchedSearch?.imageUrl ?? null,
    );

    const entry: DatasetAttributionEntry = {
      clientId: crypto.randomUUID(),
      orcid,
      role: roleDraft,
      displayName:
        resolvedUser?.name ?? matchedSearch?.displayName ?? null,
      userId: hasAtlasProfile ? (resolvedUser?.id ?? orcid) : null,
      isClaimed: hasAtlasProfile,
      hasContributionAgreement,
      imageUrl,
    };

    onAppendAttribution(entry);
    setOrcidDraft("");
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setLookupOrcid(null);
    setSelectedSearchKey(null);
    setOrcidError(null);
    return true;
  }, [
    onAppendAttribution,
    resolveOrcidForAdd,
    resolvedUser,
    roleDraft,
    searchResults,
    validAttributions,
  ]);

  const resolvedOrcidForAdd = resolveOrcidForAdd();

  const roleLabel =
    roleOptions.find((option) => option.contributorType === roleDraft)?.label ??
    contributorRoleLabel(roleDraft);

  const roleOptionSections = useMemo(
    () => groupContributorRoleOptionsByTier(roleOptions),
    [roleOptions],
  );

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

  return (
    <div className="space-y-3">
      <div>
        <p className="text-foreground text-sm font-semibold">Add researcher</p>
        <p className="text-muted mt-0.5 text-xs">
          Credit upload and beamtime collection with DataCite-aligned roles.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="attribution-researcher-search">Researcher</Label>
        <ComboBox
          fullWidth
          aria-label="Search researchers by name, institution, or ORCID"
          inputValue={searchQuery}
          onInputChange={(value) => {
            setSearchQuery(value);
            setSelectedSearchKey(null);
            setOrcidError(null);
            const normalized = normalizeOrcidUserInput(value);
            if (isValidOrcidUserId(normalized)) {
              setOrcidDraft(normalized);
              setLookupOrcid(normalized);
            } else if (!value.trim()) {
              setOrcidDraft("");
              setLookupOrcid(null);
            }
          }}
          selectedKey={selectedSearchKey}
          onSelectionChange={(key) => {
            if (key == null || typeof key !== "string") return;
            const hit = searchResults.find((row) => row.orcid === key);
            if (!hit) return;
            setSelectedSearchKey(key);
            applyOrcidSelection(hit.orcid, hit.displayName);
          }}
          items={searchResults}
          allowsEmptyCollection
        >
          <ComboBox.InputGroup>
            <Input
              id="attribution-researcher-search"
              placeholder="Search by name, institution, or ORCID iD"
              autoComplete="off"
            />
            <ComboBox.Trigger />
          </ComboBox.InputGroup>
          <ComboBox.Popover>
            <div data-attribution-nested-overlay="true">
            <ScrollShadow
              className="max-h-56 min-h-0"
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
                {searchResults.map((hit) => (
                  <ListBox.Item
                    key={hit.orcid}
                    id={hit.orcid}
                    textValue={`${hit.displayName} ${hit.orcid}`}
                  >
                    {(() => {
                      const status = researcherAttributionBadgeStatus({
                        isClaimed: hit.hasAtlasProfile,
                        hasContributionAgreement: hit.hasContributionAgreement,
                      });
                      return (
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Badge.Anchor className="shrink-0">
                        <ResearcherAvatar
                          displayName={hit.displayName}
                          imageUrl={hit.imageUrl}
                          identitySeed={hit.orcid}
                          isAtlasProfile={hit.hasAtlasProfile}
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
                      );
                    })()}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </ScrollShadow>
            </div>
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
        {lookupOrcid && !orcidError ? (
          <p className="text-muted text-xs">
            {isResolving
              ? "Looking up Atlas profile..."
              : resolvedUser
                ? `Atlas profile: ${resolvedUser.name ?? resolvedUser.id}`
                : "No Atlas account yet; ORCID stored as unclaimed"}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Attribution role</Label>
        <Select
          aria-label="Attribution role"
          selectedKey={roleDraft}
          onSelectionChange={(key) => {
            if (typeof key === "string") {
              const match = roleOptions.find(
                (option) => option.contributorType === key,
              );
              if (match) {
                setRoleDraft(match.contributorType);
              }
            }
          }}
        >
          <Select.Trigger>
            <Select.Value>{roleLabel}</Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <div data-attribution-nested-overlay="true">
            <ScrollShadow
              className="max-h-64 min-h-0"
              hideScrollBar
              orientation="vertical"
            >
              <ListBox aria-label="Attribution roles" className="p-1">
                {roleOptionSections.map((section, sectionIndex) => (
                  <Fragment key={section.tier}>
                    {sectionIndex > 0 ? <Separator className="my-1" /> : null}
                    <ListBox.Section>
                      <Header className="text-muted px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
                        {section.sectionLabel}
                      </Header>
                      {section.options.map((option) => (
                        <AttributionRoleListItem
                          key={option.contributorType}
                          option={option}
                        />
                      ))}
                    </ListBox.Section>
                  </Fragment>
                ))}
              </ListBox>
            </ScrollShadow>
            </div>
          </Select.Popover>
        </Select>
      </div>

      {orcidError ? (
        <ErrorMessage className="text-danger text-xs">{orcidError}</ErrorMessage>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onPress={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          isDisabled={
            !resolvedOrcidForAdd || Boolean(lookupOrcid && isResolving)
          }
          onPress={() => {
            if (handleAdd()) {
              onClose();
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
