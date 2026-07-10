"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { ErrorMessage } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Plus, Users } from "lucide-react";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import { contributorRoleLabelsForDisplay } from "~/lib/contributor-avatar-display";
import {
  ATTRIBUTION_NESTED_OVERLAY_SELECTOR,
  datasetAttributionsForAvatarDisplay,
  dedupeDatasetAttributions,
  defaultUploaderAttribution,
  filterValidOrcidAttributions,
  groupContributorRoleOptionsByTier,
  listAttributionRoleOptions,
  researcherAttributionBadgeStatus,
  contributorRoleLabel,
  isUploaderContributorRole,
  type AttributionAvatarDisplay,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import { coerceContributorRoleInput } from "~/lib/datacite-contributor-types";
import { attributionResearcherAvatarProps } from "~/lib/dataset-attribution-claim";
import type { ResolvedAttributionPublicDisplay } from "~/lib/dataset-attribution-claim";
import { isValidOrcidUserId } from "~/lib/orcid";
import { AddResearcherAttributionForm } from "./add-researcher-attribution-form";
import { ApplyTeamAttributionForm } from "./apply-team-attribution-form";
import {
  AttributionAvatarRowSkeleton,
  avatarGroupStackWidthPx,
  normalizeProfileImageUrl,
  type UserWithOrcid,
} from "~/components/ui/avatar";
import {
  PopoverMenu,
  PopoverMenuContent,
} from "~/components/ui/popover-menu";

export type DatasetAttributionChange =
  | DatasetAttributionEntry[]
  | ((
      previous: DatasetAttributionEntry[],
    ) => DatasetAttributionEntry[]);

type DatasetAttributionEditorProps = {
  attributions: DatasetAttributionEntry[];
  onChange: (rows: DatasetAttributionChange) => void;
  /** When false, hides the visible "Researchers" label (use aria-label on the avatar row). */
  showLabel?: boolean;
};

function resolvedFromAvatarDisplay(
  display: AttributionAvatarDisplay,
): ResolvedAttributionPublicDisplay {
  return {
    displayLabel: display.displayName,
    displayName: display.isOrcidOnlyDisplay ? null : display.displayName,
    imageUrl: display.image,
    showProfileImage: Boolean(display.image?.trim()),
    isOrcidOnlyLabel: display.isOrcidOnlyDisplay,
    avatarPlaceholder: display.avatarPlaceholder,
  };
}

function avatarDisplayToUser(
  display: AttributionAvatarDisplay,
  sessionOrcid: string | null,
  rowsForOrcid: DatasetAttributionEntry[],
): UserWithOrcid {
  const orcid = display.orcid.trim();
  const profileId = display.profileUserId.trim();
  const isSessionUploader =
    sessionOrcid != null &&
    orcid === sessionOrcid &&
    display.roles.some((role) => isUploaderContributorRole(role));
  const avatarProps = attributionResearcherAvatarProps({
    orcid,
    resolved: resolvedFromAvatarDisplay(display),
  });
  return {
    id: display.isClaimed ? profileId || orcid : orcid,
    orcid,
    name: avatarProps.displayName,
    image: normalizeProfileImageUrl(avatarProps.imageUrl),
    isAtlasProfile: avatarProps.isAtlasProfile,
    avatarPlaceholder: avatarProps.placeholder,
    attributionBadgeStatus: isSessionUploader
      ? "agreed"
      : researcherAttributionBadgeStatus({
          isClaimed: display.isClaimed,
          hasContributionAgreement: display.hasContributionAgreement,
        }),
    tooltipSubtitle: contributorRoleLabelsForDisplay(display.roles),
    hoverRoleLabel: contributorRoleLabelsForDisplay(display.roles),
    avatarStackKey: display.stackKey,
    contributorRemoveRows: rowsForOrcid.map((row) => ({
      rowKey: row.clientId,
      roleLabel: contributorRoleLabel(row.role),
      contributorRole: row.role,
      removeDisabled:
        isUploaderContributorRole(row.role) && row.orcid === sessionOrcid,
      roleChangeDisabled:
        isUploaderContributorRole(row.role) && row.orcid === sessionOrcid,
    })),
  };
}

export function DatasetAttributionEditor({
  attributions,
  onChange,
  showLabel = true,
}: DatasetAttributionEditorProps) {
  const { data: session } = useSession();
  const sessionOrcid = session?.user?.id ?? null;
  const sessionName = session?.user?.name ?? null;
  const sessionImage = normalizeProfileImageUrl(session?.user?.image);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const validAttributions = useMemo(
    () => filterValidOrcidAttributions(attributions),
    [attributions],
  );

  const avatarDisplays = useMemo(
    () => datasetAttributionsForAvatarDisplay(validAttributions),
    [validAttributions],
  );

  const rowsByOrcid = useMemo(() => {
    const map = new Map<string, DatasetAttributionEntry[]>();
    for (const row of validAttributions) {
      const key = row.orcid.trim();
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }, [validAttributions]);

  const avatarUsers = useMemo(
    () =>
      avatarDisplays.map((display) =>
        avatarDisplayToUser(
          display,
          sessionOrcid,
          rowsByOrcid.get(display.orcid) ?? [],
        ),
      ),
    [avatarDisplays, rowsByOrcid, sessionOrcid],
  );

  const avatarStackWidthPx = useMemo(
    () =>
      avatarGroupStackWidthPx({
        avatarCount: avatarUsers.length,
        max: 8,
        size: "sm",
        trailingSlotCount: 2,
      }),
    [avatarUsers.length],
  );

  const [orcidError, setOrcidError] = useState<string | null>(null);

  const roleOptionSections = useMemo(
    () =>
      groupContributorRoleOptionsByTier(listAttributionRoleOptions()).map(
        (section) => ({
          sectionLabel: section.sectionLabel,
          options: section.options.map((option) => ({
            contributorType: option.contributorType,
            label: option.label,
          })),
        }),
      ),
    [],
  );

  useEffect(() => {
    if (!sessionOrcid || validAttributions.length > 0) {
      return;
    }
    onChangeRef.current([
      defaultUploaderAttribution({
        orcid: sessionOrcid,
        displayName: sessionName,
        imageUrl: sessionImage,
      }),
    ]);
  }, [sessionImage, sessionName, sessionOrcid, validAttributions.length]);

  useEffect(() => {
    const hasInvalid = attributions.some(
      (row) => !isValidOrcidUserId(row.orcid),
    );
    if (hasInvalid) {
      onChangeRef.current((previous) => filterValidOrcidAttributions(previous));
    }
  }, [attributions]);

  const handleAppendAttribution = useCallback(
    (entry: DatasetAttributionEntry) => {
      const normalizedEntry: DatasetAttributionEntry = {
        ...entry,
        hasContributionAgreement: entry.hasContributionAgreement ?? false,
        imageUrl: normalizeProfileImageUrl(entry.imageUrl),
      };
      onChangeRef.current((previous) =>
        dedupeDatasetAttributions([
          ...filterValidOrcidAttributions(previous),
          normalizedEntry,
        ]),
      );
      setOrcidError(null);
    },
    [],
  );

  const handleRemove = useCallback((row: DatasetAttributionEntry) => {
    onChangeRef.current((previous) => {
      const valid = filterValidOrcidAttributions(previous);
      if (isUploaderContributorRole(row.role)) {
        const uploaderCount = valid.filter((item) =>
          isUploaderContributorRole(item.role),
        ).length;
        if (uploaderCount <= 1) {
          setOrcidError("At least one data curator (uploader) is required");
          return previous;
        }
      }
      setOrcidError(null);
      return valid.filter((item) => item.clientId !== row.clientId);
    });
  }, []);

  const handleRemoveContributorRow = useCallback(
    ({ rowKey }: { user: UserWithOrcid; rowKey: string }) => {
      const row = validAttributions.find((item) => item.clientId === rowKey);
      if (row) {
        handleRemove(row);
      }
    },
    [handleRemove, validAttributions],
  );

  const handleRoleChangeContributorRow = useCallback(
    ({
      rowKey,
      role: nextRoleRaw,
    }: {
      user: UserWithOrcid;
      rowKey: string;
      role: string;
    }) => {
      const nextRole = coerceContributorRoleInput(nextRoleRaw);
      if (!nextRole) {
        setOrcidError("Unsupported attribution role");
        return;
      }
      onChangeRef.current((previous) => {
        const valid = filterValidOrcidAttributions(previous);
        const target = valid.find((item) => item.clientId === rowKey);
        if (!target) {
          return previous;
        }
        if (target.role === nextRole) {
          return previous;
        }
        const duplicateKey = `${target.orcid.trim()}:${nextRole}`;
        if (
          valid.some(
            (item) =>
              item.clientId !== rowKey &&
              `${item.orcid.trim()}:${item.role}` === duplicateKey,
          )
        ) {
          setOrcidError("This person already has that role on the dataset");
          return previous;
        }
        if (isUploaderContributorRole(nextRole)) {
          const existingUploader = valid.find(
            (item) =>
              isUploaderContributorRole(item.role) &&
              item.clientId !== rowKey,
          );
          if (existingUploader && existingUploader.orcid !== target.orcid) {
            setOrcidError(
              "Only one data curator (uploader) is allowed per dataset",
            );
            return previous;
          }
        }
        if (
          isUploaderContributorRole(target.role) &&
          target.orcid === sessionOrcid &&
          !isUploaderContributorRole(nextRole)
        ) {
          const uploaderCount = valid.filter((item) =>
            isUploaderContributorRole(item.role),
          ).length;
          if (uploaderCount <= 1) {
            setOrcidError("At least one data curator (uploader) is required");
            return previous;
          }
        }
        setOrcidError(null);
        return valid.map((item) =>
          item.clientId === rowKey ? { ...item, role: nextRole } : item,
        );
      });
    },
    [sessionOrcid],
  );

  const handleApplyTeamAttributions = useCallback(
    (rows: DatasetAttributionEntry[]) => {
      onChangeRef.current(dedupeDatasetAttributions(filterValidOrcidAttributions(rows)));
      setOrcidError(null);
    },
    [],
  );

  const addResearcherControl = (
    <div className="flex items-center gap-1">
      <PopoverMenu
        align="start"
        placement="auto"
        ignoreOutsidePointerDownSelector={ATTRIBUTION_NESTED_OVERLAY_SELECTOR}
        renderTrigger={({ triggerProps, isOpen }) => (
          <button
            type="button"
            {...triggerProps}
            className={cn(
              "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground focus-visible:ring-accent inline-flex size-8 shrink-0 items-center justify-center rounded-full border p-0 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isOpen && "ring-accent ring-2 ring-offset-2",
            )}
            aria-label="Add from team"
          >
            <Users className="size-4" aria-hidden />
          </button>
        )}
        renderContent={({ close, contentProps, contentPositionClassName }) => (
          <PopoverMenuContent
            {...contentProps}
            className={cn(
              contentPositionClassName,
              "border-border bg-surface w-[min(20rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg",
            )}
          >
            <ApplyTeamAttributionForm
              validAttributions={validAttributions}
              onApplyAttributions={handleApplyTeamAttributions}
              onClose={close}
            />
          </PopoverMenuContent>
        )}
      />
      <PopoverMenu
        align="start"
        placement="auto"
        ignoreOutsidePointerDownSelector={ATTRIBUTION_NESTED_OVERLAY_SELECTOR}
        renderTrigger={({ triggerProps, isOpen }) => (
          <button
            type="button"
            {...triggerProps}
            className={cn(
              "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground focus-visible:ring-accent inline-flex size-8 shrink-0 items-center justify-center rounded-full border p-0 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isOpen && "ring-accent ring-2 ring-offset-2",
            )}
            aria-label="Add researcher attribution"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        )}
        renderContent={({ close, contentProps, contentPositionClassName }) => (
          <PopoverMenuContent
            {...contentProps}
            className={cn(
              contentPositionClassName,
              "border-border bg-surface w-[min(20rem,calc(100vw-2rem))] rounded-lg border p-4 shadow-lg",
            )}
          >
            <AddResearcherAttributionForm
              validAttributions={validAttributions}
              onAppendAttribution={handleAppendAttribution}
              onClose={close}
            />
          </PopoverMenuContent>
        )}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex h-8 min-w-0 items-center",
          showLabel ? "gap-3" : "gap-0",
        )}
      >
        {showLabel ? (
          <span className="text-muted shrink-0 text-sm font-medium leading-none">
            Researchers
          </span>
        ) : null}
        <div
          className="flex min-w-0 flex-1 items-center overflow-visible"
          {...(!showLabel
            ? { role: "group" as const, "aria-label": "Researchers" }
            : {})}
        >
          <div
            className="flex shrink-0 items-center overflow-visible"
            style={{ minWidth: avatarStackWidthPx }}
          >
            {avatarUsers.length === 0 ? (
              <AttributionAvatarRowSkeleton
                avatarCount={1}
                max={8}
                size="sm"
                trailingSlotCount={2}
              />
            ) : (
              <ContributorAvatarGroup
                key={avatarUsers
                  .map((user) => user.avatarStackKey ?? user.orcid ?? user.id)
                  .join("|")}
                users={avatarUsers}
                size="sm"
                max={8}
                trailingSlot={addResearcherControl}
                onRemoveContributorRow={handleRemoveContributorRow}
                onRoleChangeContributorRow={handleRoleChangeContributorRow}
                contributorRoleOptionSections={roleOptionSections}
              />
            )}
          </div>
        </div>
      </div>
      {orcidError && avatarDisplays.length > 0 ? (
        <ErrorMessage className="text-danger text-xs">{orcidError}</ErrorMessage>
      ) : null}
    </div>
  );
}
