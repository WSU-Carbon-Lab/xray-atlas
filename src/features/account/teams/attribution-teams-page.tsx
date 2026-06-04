"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "@heroui/react";
import { skipToken } from "@tanstack/react-query";
import {
  Button,
  ComboBox,
  ErrorMessage,
  Header,
  Input,
  Label,
  ListBox,
  ScrollShadow,
  Select,
  Separator,
  Spinner,
  TextArea,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ResearcherAvatar } from "~/components/ui/avatar";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";
import {
  classifyAttributionSearchQuery,
  isAttributionSearchQueryReady,
} from "~/lib/attribution-researcher-search";
import {
  filterGeneralTeamMembersForEditor,
  type AttributionTeamGroupType,
} from "~/lib/attribution-team-roster-sync";
import {
  groupContributorRoleOptionsByTier,
  listAttributionRoleOptions,
  type AttributionRoleOption,
} from "~/lib/nexafs-attribution";
import {
  contributorRoleLabel,
  type DataCiteContributorType,
} from "~/lib/datacite-contributor-types";
import {
  normalizeOrcidUserInput,
  orcidUserIdSchema,
} from "~/lib/orcid";
import { trpc } from "~/trpc/client";

export type TeamMemberDraft = {
  orcid: string;
  contributorType: DataCiteContributorType;
  displayName: string | null;
};

type TeamEditorDialogProps = {
  isOpen: boolean;
  teamId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

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
        </span>
        <span className="text-muted text-xs leading-snug">{option.description}</span>
      </div>
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}

function groupTypeLabel(groupType: AttributionTeamGroupType): string {
  return groupType === "beamtime" ? "Beamtime group" : "Working group";
}

type TeamOrcidSearchPickerProps = {
  id: string;
  label: string;
  helperText: string;
  selectedOrcid: string | null;
  selectedDisplayName: string | null;
  onSelect: (value: { orcid: string; displayName: string | null } | null) => void;
};

function TeamOrcidSearchPicker({
  id,
  label,
  helperText,
  selectedOrcid,
  selectedDisplayName,
  onSelect,
}: TeamOrcidSearchPickerProps) {
  const [searchQuery, setSearchQuery] = useState(
    selectedDisplayName ?? selectedOrcid ?? "",
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedSearchKey, setSelectedSearchKey] = useState<Key | null>(
    selectedOrcid,
  );

  useEffect(() => {
    setSearchQuery(selectedDisplayName ?? selectedOrcid ?? "");
    setSelectedSearchKey(selectedOrcid);
  }, [selectedDisplayName, selectedOrcid]);

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

  const { data: searchData, isFetching: isSearching } =
    trpc.users.searchForAttribution.useQuery(
      searchEnabled ? { query: debouncedSearchQuery, limit: 15 } : skipToken,
      { staleTime: 30_000, retry: false },
    );

  const searchResults = useMemo(
    () => searchData?.results ?? [],
    [searchData?.results],
  );

  const resolveOrcid = useCallback((): string | null => {
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

  const handleApplySelection = () => {
    const orcid = resolveOrcid();
    if (!orcid) return;
    const hit = searchResults.find((row) => row.orcid === orcid);
    onSelect({
      orcid,
      displayName: hit?.displayName ?? selectedDisplayName,
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-muted text-xs leading-snug">{helperText}</p>
      <ComboBox
        fullWidth
        aria-label={label}
        inputValue={searchQuery}
        onInputChange={(value) => {
          setSearchQuery(value);
          setSelectedSearchKey(null);
        }}
        selectedKey={selectedSearchKey}
        onSelectionChange={(key) => {
          if (key == null || typeof key !== "string") return;
          const hit = searchResults.find((row) => row.orcid === key);
          if (!hit) return;
          setSelectedSearchKey(key);
          setSearchQuery(hit.displayName);
          onSelect({ orcid: hit.orcid, displayName: hit.displayName });
        }}
        items={searchResults}
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input id={id} placeholder="Search by name or ORCID" autoComplete="off" />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <div data-attribution-nested-overlay="true">
            <ScrollShadow className="max-h-40 min-h-0" hideScrollBar orientation="vertical">
              <ListBox aria-label={`${label} search results`}>
                {searchResults.map((hit) => (
                  <ListBox.Item
                    key={hit.orcid}
                    id={hit.orcid}
                    textValue={`${hit.displayName} ${hit.orcid}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <ResearcherAvatar
                        displayName={hit.displayName}
                        imageUrl={hit.imageUrl}
                        identitySeed={hit.orcid}
                        isAtlasProfile={hit.hasAtlasProfile}
                        size="sm"
                        className="h-7 w-7 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm">{hit.displayName}</p>
                        <p className="text-muted font-mono text-xs">{hit.orcid}</p>
                      </div>
                    </div>
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
          Searching...
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onPress={handleApplySelection}
          isDisabled={!resolveOrcid()}
        >
          Set {label.toLowerCase()}
        </Button>
        {selectedOrcid ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onPress={() => {
              setSearchQuery("");
              setSelectedSearchKey(null);
              onSelect(null);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      {selectedOrcid ? (
        <p className="text-muted text-xs">
          Selected: {selectedDisplayName ?? selectedOrcid} ({selectedOrcid})
        </p>
      ) : null}
    </div>
  );
}

function TeamEditorDialog({
  isOpen,
  teamId,
  onClose,
  onSaved,
}: TeamEditorDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = teamId != null;
  const detailQuery = trpc.attributionTeams.getById.useQuery(
    teamId ? { teamId } : skipToken,
    { enabled: isOpen && isEdit },
  );

  const createMutation = trpc.attributionTeams.create.useMutation({
    onSuccess: async () => {
      await utils.attributionTeams.listMine.invalidate();
      showToast("Team created", "success");
      onSaved();
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const updateMutation = trpc.attributionTeams.update.useMutation({
    onSuccess: async () => {
      await utils.attributionTeams.listMine.invalidate();
      if (teamId) {
        await utils.attributionTeams.getById.invalidate({ teamId });
      }
      showToast("Team updated", "success");
      onSaved();
      onClose();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [researchGroupName, setResearchGroupName] = useState("");
  const [groupType, setGroupType] = useState<AttributionTeamGroupType>("beamtime");
  const [piOrcid, setPiOrcid] = useState<string | null>(null);
  const [piDisplayName, setPiDisplayName] = useState<string | null>(null);
  const [experimentLeadOrcid, setExperimentLeadOrcid] = useState<string | null>(null);
  const [experimentLeadDisplayName, setExperimentLeadDisplayName] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [members, setMembers] = useState<TeamMemberDraft[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleDraft, setRoleDraft] =
    useState<DataCiteContributorType>("DataCollector");
  const [selectedSearchKey, setSelectedSearchKey] = useState<Key | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const roleOptions = useMemo(() => listAttributionRoleOptions(), []);
  const roleOptionSections = useMemo(
    () => groupContributorRoleOptionsByTier(roleOptions),
    [roleOptions],
  );
  const roleLabel =
    roleOptions.find((option) => option.contributorType === roleDraft)?.label ??
    contributorRoleLabel(roleDraft);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchQuery(searchQuery.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && detailQuery.data) {
      const team = detailQuery.data;
      setName(team.name);
      setInstitution(team.institution ?? "");
      setResearchGroupName(team.researchGroupName ?? "");
      setGroupType(team.groupType);
      setPiOrcid(team.piOrcid);
      setExperimentLeadOrcid(team.experimentLeadOrcid);
      setDescription(team.description ?? "");

      const piMember = team.piOrcid
        ? team.members.find(
            (member) =>
              member.orcid === team.piOrcid &&
              (member.contributorType === "Supervisor" ||
                member.contributorType === "ProjectLeader"),
          )
        : null;
      setPiDisplayName(piMember?.displayName ?? null);

      const leadMember = team.experimentLeadOrcid
        ? team.members.find(
            (member) =>
              member.orcid === team.experimentLeadOrcid &&
              (member.contributorType === "ProjectLeader" ||
                member.contributorType === "Researcher"),
          )
        : null;
      setExperimentLeadDisplayName(leadMember?.displayName ?? null);

      setMembers(
        filterGeneralTeamMembersForEditor({
          members: team.members.map((member) => ({
            orcid: member.orcid,
            contributorType: member.contributorType,
            displayName: member.displayName,
          })),
          piOrcid: team.piOrcid,
          experimentLeadOrcid: team.experimentLeadOrcid,
        }),
      );
      return;
    }
    if (!isEdit) {
      setName("");
      setInstitution("");
      setResearchGroupName("");
      setGroupType("beamtime");
      setPiOrcid(null);
      setPiDisplayName(null);
      setExperimentLeadOrcid(null);
      setExperimentLeadDisplayName(null);
      setDescription("");
      setMembers([]);
    }
  }, [detailQuery.data, isEdit, isOpen]);

  const searchClassification = useMemo(
    () => classifyAttributionSearchQuery(debouncedSearchQuery),
    [debouncedSearchQuery],
  );

  const searchEnabled = isAttributionSearchQueryReady(
    searchClassification.mode,
    debouncedSearchQuery,
  );

  const { data: searchData, isFetching: isSearching } =
    trpc.users.searchForAttribution.useQuery(
      searchEnabled ? { query: debouncedSearchQuery, limit: 15 } : skipToken,
      { staleTime: 30_000, retry: false },
    );

  const searchResults = useMemo(
    () => searchData?.results ?? [],
    [searchData?.results],
  );

  const resolveOrcidForAdd = useCallback((): string | null => {
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

  const handleAddMember = useCallback(() => {
    const orcid = resolveOrcidForAdd();
    if (!orcid) {
      setMemberError("Select a researcher from the list or enter a valid ORCID iD");
      return;
    }
    const key = `${orcid}:${roleDraft}`;
    if (members.some((member) => `${member.orcid}:${member.contributorType}` === key)) {
      setMemberError("This person already has that role on the team");
      return;
    }
    const hit = searchResults.find((row) => row.orcid === orcid);
    setMembers((previous) => [
      ...previous,
      {
        orcid,
        contributorType: roleDraft,
        displayName: hit?.displayName ?? null,
      },
    ]);
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedSearchKey(null);
    setMemberError(null);
  }, [members, resolveOrcidForAdd, roleDraft, searchResults]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Team name is required");
      return;
    }
    setFormError(null);
    const payload = {
      name: trimmedName,
      institution: institution.trim() ? institution.trim() : null,
      researchGroupName: researchGroupName.trim() ? researchGroupName.trim() : null,
      groupType,
      piOrcid,
      experimentLeadOrcid,
      description: description.trim() ? description.trim() : null,
      members,
    };
    if (isEdit && teamId) {
      updateMutation.mutate({ teamId, ...payload });
      return;
    }
    createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoadingDetail = isEdit && detailQuery.isLoading;

  return (
    <SimpleDialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit team" : "Create team"}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {isLoadingDetail ? (
          <div className="text-muted flex items-center gap-2 py-8 text-sm">
            <Spinner size="sm" />
            Loading team...
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="team-name">Team name</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="2026 Spring beamtime"
                />
                <p className="text-muted text-xs">
                  Short label for this saved roster (for example a campaign or upload batch).
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-institution">Institution</Label>
                <Input
                  id="team-institution"
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  placeholder="University or facility"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team-research-group">Research group name</Label>
                <Input
                  id="team-research-group"
                  value={researchGroupName}
                  onChange={(event) => setResearchGroupName(event.target.value)}
                  placeholder="Lab or group name"
                />
                <p className="text-muted text-xs">
                  Distinct from the team label above; use the lab or research group identity.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Group type</Label>
              <ToggleButtonGroup
                aria-label="Team group type"
                selectionMode="single"
                selectedKeys={new Set([groupType])}
                onSelectionChange={(keys) => {
                  const next = [...keys][0];
                  if (next === "beamtime" || next === "working") {
                    setGroupType(next);
                  }
                }}
              >
                <ToggleButton id="beamtime">Beamtime group</ToggleButton>
                <ToggleButton id="working">Working group</ToggleButton>
              </ToggleButtonGroup>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TeamOrcidSearchPicker
                id="team-pi"
                label="Supervisor"
                helperText="Beamtime PI or group supervisor. Saved as DataCite Supervisor."
                selectedOrcid={piOrcid}
                selectedDisplayName={piDisplayName}
                onSelect={(value) => {
                  setPiOrcid(value?.orcid ?? null);
                  setPiDisplayName(value?.displayName ?? null);
                }}
              />
              <TeamOrcidSearchPicker
                id="team-experiment-lead"
                label="Experiment lead"
                helperText="Lead experimenter for the dataset. Saved as DataCite ProjectLeader."
                selectedOrcid={experimentLeadOrcid}
                selectedDisplayName={experimentLeadDisplayName}
                onSelect={(value) => {
                  setExperimentLeadOrcid(value?.orcid ?? null);
                  setExperimentLeadDisplayName(value?.displayName ?? null);
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-description">Description (optional)</Label>
              <TextArea
                id="team-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Short note for your own reference"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <p className="text-foreground text-sm font-semibold">Additional members</p>
              {members.length === 0 ? (
                <p className="text-muted text-xs">Add researchers with preset attribution roles.</p>
              ) : (
                <ul className="border-border divide-border divide-y rounded-lg border">
                  {members.map((member) => (
                    <li
                      key={`${member.orcid}:${member.contributorType}`}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-foreground truncate text-sm font-medium">
                          {member.displayName ?? member.orcid}
                        </p>
                        <p className="text-muted text-xs">
                          {contributorRoleLabel(member.contributorType)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label={`Remove ${member.displayName ?? member.orcid}`}
                        onPress={() =>
                          setMembers((previous) =>
                            previous.filter(
                              (row) =>
                                !(
                                  row.orcid === member.orcid &&
                                  row.contributorType === member.contributorType
                                ),
                            ),
                          )
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-border space-y-3 rounded-lg border p-3">
              <p className="text-foreground text-sm font-medium">Add member</p>
              <ComboBox
                fullWidth
                aria-label="Search researchers"
                inputValue={searchQuery}
                onInputChange={(value) => {
                  setSearchQuery(value);
                  setSelectedSearchKey(null);
                  setMemberError(null);
                }}
                selectedKey={selectedSearchKey}
                onSelectionChange={(key) => {
                  if (key == null || typeof key !== "string") return;
                  const hit = searchResults.find((row) => row.orcid === key);
                  if (!hit) return;
                  setSelectedSearchKey(key);
                  setSearchQuery(hit.displayName);
                }}
                items={searchResults}
                allowsEmptyCollection
              >
                <ComboBox.InputGroup>
                  <Input placeholder="Search by name or ORCID" autoComplete="off" />
                  <ComboBox.Trigger />
                </ComboBox.InputGroup>
                <ComboBox.Popover>
                  <div data-attribution-nested-overlay="true">
                    <ScrollShadow className="max-h-48 min-h-0" hideScrollBar orientation="vertical">
                      <ListBox aria-label="Researcher search results">
                        {searchResults.map((hit) => (
                          <ListBox.Item
                            key={hit.orcid}
                            id={hit.orcid}
                            textValue={`${hit.displayName} ${hit.orcid}`}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <ResearcherAvatar
                                displayName={hit.displayName}
                                imageUrl={hit.imageUrl}
                                identitySeed={hit.orcid}
                                isAtlasProfile={hit.hasAtlasProfile}
                                size="sm"
                                className="h-7 w-7 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-foreground truncate text-sm">{hit.displayName}</p>
                                <p className="text-muted font-mono text-xs">{hit.orcid}</p>
                              </div>
                            </div>
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
                  Searching...
                </p>
              ) : null}
              <Select
                aria-label="Member role"
                selectedKey={roleDraft}
                onSelectionChange={(key) => {
                  if (typeof key === "string") {
                    const match = roleOptions.find(
                      (option) => option.contributorType === key,
                    );
                    if (match) setRoleDraft(match.contributorType);
                  }
                }}
              >
                <Select.Trigger>
                  <Select.Value>{roleLabel}</Select.Value>
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <div data-attribution-nested-overlay="true">
                    <ScrollShadow className="max-h-56 min-h-0" hideScrollBar orientation="vertical">
                      <ListBox aria-label="Member roles" className="p-1">
                        {roleOptionSections.map((section, sectionIndex) => (
                          <Fragment key={section.tier}>
                            {sectionIndex > 0 ? <Separator className="my-1" /> : null}
                            <ListBox.Section>
                              <Header className="text-muted px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase">
                                {section.sectionLabel}
                              </Header>
                              {section.options.map((option) => (
                                <AttributionRoleListItem key={option.contributorType} option={option} />
                              ))}
                            </ListBox.Section>
                          </Fragment>
                        ))}
                      </ListBox>
                    </ScrollShadow>
                  </div>
                </Select.Popover>
              </Select>
              <Button type="button" variant="secondary" size="sm" onPress={handleAddMember}>
                Add to team
              </Button>
              {memberError ? (
                <ErrorMessage className="text-danger text-xs">{memberError}</ErrorMessage>
              ) : null}
            </div>

            {formError ? (
              <ErrorMessage className="text-danger text-xs">{formError}</ErrorMessage>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onPress={onClose} isDisabled={isPending}>
                Cancel
              </Button>
              <Button type="button" variant="primary" onPress={handleSave} isDisabled={isPending}>
                {isEdit ? "Save team" : "Create team"}
              </Button>
            </div>
          </>
        )}
      </div>
    </SimpleDialog>
  );
}

export function AttributionTeamsPage() {
  const utils = trpc.useUtils();
  const teamsQuery = trpc.attributionTeams.listMine.useQuery();
  const deleteMutation = trpc.attributionTeams.delete.useMutation({
    onSuccess: async () => {
      await utils.attributionTeams.listMine.invalidate();
      showToast("Team deleted", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingTeamId(null);
    setEditorOpen(true);
  };

  const openEdit = (teamId: string) => {
    setEditingTeamId(teamId);
    setEditorOpen(true);
  };

  const teams = teamsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Attribution teams
          </h1>
          <p className="text-muted mt-1 max-w-2xl text-sm leading-relaxed">
            Teams you own or belong to. Save beamtime groups with preset DataCite
            roles, then bulk-add them when crediting NEXAFS datasets.
          </p>
        </div>
        <Button variant="primary" onPress={openCreate}>
          <Plus className="size-4" aria-hidden />
          Create team
        </Button>
      </div>

      {teamsQuery.isLoading ? (
        <div className="text-muted flex items-center gap-2 text-sm">
          <Spinner size="sm" />
          Loading teams...
        </div>
      ) : teamsQuery.isError ? (
        <ErrorMessage className="text-danger text-sm">
          Could not load teams. Try again.
        </ErrorMessage>
      ) : teams.length === 0 ? (
        <div className="border-border bg-surface rounded-xl border p-8 text-center">
          <p className="text-foreground text-sm font-medium">No teams yet</p>
          <p className="text-muted mt-1 text-xs">
            Create a team or ask a colleague to add your ORCID to their roster.
          </p>
          <Button className="mt-4" variant="secondary" onPress={openCreate}>
            Create your first team
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {teams.map((team) => (
            <li
              key={team.id}
              className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div className="min-w-0">
                <p className="text-foreground font-semibold">{team.name}</p>
                {team.researchGroupName ? (
                  <p className="text-muted mt-0.5 text-sm">{team.researchGroupName}</p>
                ) : null}
                {team.institution ? (
                  <p className="text-muted text-sm">{team.institution}</p>
                ) : null}
                {team.description ? (
                  <p className="text-muted mt-0.5 text-sm">{team.description}</p>
                ) : null}
                <p className="text-muted mt-1 text-xs">
                  {groupTypeLabel(team.groupType)}
                  {" · "}
                  {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                  {!team.isOwner ? " · Member" : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onPress={() => openEdit(team.id)}
                  isDisabled={!team.isOwner}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    if (
                      window.confirm(
                        `Delete team "${team.name}"? This cannot be undone.`,
                      )
                    ) {
                      deleteMutation.mutate({ teamId: team.id });
                    }
                  }}
                  isDisabled={!team.isOwner || deleteMutation.isPending}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <TeamEditorDialog
        isOpen={editorOpen}
        teamId={editingTeamId}
        onClose={() => setEditorOpen(false)}
        onSaved={() => {
          void teamsQuery.refetch();
        }}
      />
    </div>
  );
}
