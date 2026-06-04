"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Button,
  ErrorMessage,
  Label,
  ListBox,
  Select,
  Spinner,
} from "@heroui/react";
import { mergeTeamMembersIntoDatasetAttributions } from "~/lib/attribution-team-merge";
import { contributorRoleLabel } from "~/lib/datacite-contributor-types";
import type { AttributionTeamGroupType } from "~/lib/attribution-team-roster-sync";
import {
  dedupeDatasetAttributions,
  filterValidOrcidAttributions,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import {
  AttributionAvatarRowSkeleton,
  normalizeProfileImageUrl,
} from "~/components/ui/avatar";
import { trpc } from "~/trpc/client";

type ApplyTeamAttributionFormProps = {
  validAttributions: DatasetAttributionEntry[];
  onApplyAttributions: (rows: DatasetAttributionEntry[]) => void;
  onClose: () => void;
};

export function ApplyTeamAttributionForm({
  validAttributions,
  onApplyAttributions,
  onClose,
}: ApplyTeamAttributionFormProps) {
  const { data: session } = useSession();
  const sessionOrcid = session?.user?.id ?? null;
  const sessionName = session?.user?.name ?? null;
  const sessionImage = normalizeProfileImageUrl(session?.user?.image);

  const teamsQuery = trpc.attributionTeams.listMine.useQuery(undefined, {
    staleTime: 60_000,
  });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const teamDetailQuery = trpc.attributionTeams.getById.useQuery(
    selectedTeamId ? { teamId: selectedTeamId } : skipToken,
  );

  const teams = teamsQuery.data ?? [];
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);
  const selectedLabel = selectedTeam?.name ?? "Select a team";

  const teamSecondaryLabel = (team: {
    researchGroupName: string | null;
    institution: string | null;
    groupType: AttributionTeamGroupType;
    memberCount: number;
  }) => {
    const parts = [
      team.researchGroupName ?? team.institution,
      team.groupType === "beamtime" ? "Beamtime" : "Working",
      `${team.memberCount} member${team.memberCount === 1 ? "" : "s"}`,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const previewMembers = teamDetailQuery.data?.members ?? [];

  const handleApply = () => {
    if (!sessionOrcid) {
      setApplyError("Sign in to apply a team");
      return;
    }
    if (!teamDetailQuery.data) {
      setApplyError("Select a team first");
      return;
    }
    if (teamDetailQuery.data.members.length === 0) {
      setApplyError("This team has no members");
      return;
    }

    const merged = mergeTeamMembersIntoDatasetAttributions({
      currentAttributions: filterValidOrcidAttributions(validAttributions),
      teamMembers: teamDetailQuery.data.members.map((member) => ({
        orcid: member.orcid,
        contributorType: member.contributorType,
        displayName: member.displayName,
        userId: member.userId,
        isClaimed: member.isClaimed,
        hasContributionAgreement: member.hasContributionAgreement,
        imageUrl: member.imageUrl,
      })),
      uploaderOrcid: sessionOrcid,
      uploaderDisplayName: sessionName,
      uploaderImageUrl: sessionImage,
      uploaderHasContributionAgreement: false,
    });

    onApplyAttributions(dedupeDatasetAttributions(merged));
    setApplyError(null);
    onClose();
  };

  const emptyTeamsMessage = useMemo(() => {
    if (teamsQuery.isLoading) return null;
    if (teams.length === 0) {
      return "Create an attribution team from the account menu to use bulk add.";
    }
    return null;
  }, [teams.length, teamsQuery.isLoading]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-foreground text-sm font-semibold">Add from team</p>
        <p className="text-muted mt-0.5 text-xs">
          Merges preset roles into this dataset. You stay credited as data curator.
        </p>
      </div>

      {teamsQuery.isLoading ? (
        <div className="text-muted flex items-center gap-2 text-xs">
          <Spinner size="sm" />
          Loading teams...
        </div>
      ) : emptyTeamsMessage ? (
        <p className="text-muted text-xs">{emptyTeamsMessage}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>Team</Label>
          <Select
            aria-label="Attribution team"
            selectedKey={selectedTeamId}
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                setSelectedTeamId(key);
                setApplyError(null);
              }
            }}
          >
            <Select.Trigger>
              <Select.Value>{selectedLabel}</Select.Value>
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <div data-attribution-nested-overlay="true">
                <ListBox aria-label="Teams">
                  {teams.map((team) => (
                    <ListBox.Item
                      key={team.id}
                      id={team.id}
                      textValue={team.name}
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="text-foreground text-sm font-medium">
                          {team.name}
                        </span>
                        <span className="text-muted text-xs">
                          {teamSecondaryLabel(team)}
                        </span>
                      </div>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </div>
            </Select.Popover>
          </Select>
        </div>
      )}

      {selectedTeamId && teamDetailQuery.isFetching ? (
        <AttributionAvatarRowSkeleton
          avatarCount={Math.max(3, previewMembers.length)}
          max={8}
          size="sm"
          trailingSlotCount={0}
        />
      ) : null}

      {previewMembers.length > 0 ? (
        <ul className="border-border max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
          {previewMembers.map((member) => (
            <li
              key={`${member.orcid}:${member.contributorType}`}
              className="text-muted flex justify-between gap-2 text-xs"
            >
              <span className="text-foreground truncate">
                {member.displayName ?? member.orcid}
              </span>
              <span className="shrink-0">
                {contributorRoleLabel(member.contributorType)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {applyError ? (
        <ErrorMessage className="text-danger text-xs">{applyError}</ErrorMessage>
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
            !selectedTeamId ||
            teamDetailQuery.isFetching ||
            previewMembers.length === 0
          }
          onPress={handleApply}
        >
          Apply team
        </Button>
      </div>
    </div>
  );
}
