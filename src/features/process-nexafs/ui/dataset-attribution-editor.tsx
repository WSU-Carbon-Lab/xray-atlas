"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { Button, ErrorMessage } from "@heroui/react";
import { cn } from "@heroui/styles";
import { Plus, Trash2, Users } from "lucide-react";
import { ORCIDIcon } from "~/components/icons";
import {
  AvatarGroup,
  CustomAvatar,
  normalizeProfileImageUrl,
  type UserWithOrcid,
} from "~/components/ui/avatar";
import {
  PopoverMenu,
  PopoverMenuContent,
} from "~/components/ui/popover-menu";
import {
  ATTRIBUTION_NESTED_OVERLAY_SELECTOR,
  datasetAttributionsForAvatarDisplay,
  dedupeDatasetAttributions,
  defaultUploaderAttribution,
  filterValidOrcidAttributions,
  researcherAttributionBadgeStatus,
  contributorRoleLabel,
  isUploaderContributorRole,
  type AttributionAvatarDisplay,
  type DatasetAttributionEntry,
} from "~/lib/nexafs-attribution";
import type { DataCiteContributorType } from "~/lib/datacite-contributor-types";
import { isValidOrcidUserId } from "~/lib/orcid";
import { AddResearcherAttributionForm } from "./add-researcher-attribution-form";
import { ApplyTeamAttributionForm } from "./apply-team-attribution-form";

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

function roleLabelsForDisplay(roles: DataCiteContributorType[]): string {
  return roles.map((role) => contributorRoleLabel(role)).join(", ");
}

function avatarDisplayToUser(
  display: AttributionAvatarDisplay,
  sessionOrcid: string | null = null,
): UserWithOrcid {
  const orcid = display.orcid.trim();
  const profileId = display.profileUserId.trim();
  const isSessionUploader =
    sessionOrcid != null &&
    orcid === sessionOrcid &&
    display.roles.some((role) => isUploaderContributorRole(role));
  return {
    id: display.isClaimed ? profileId || orcid : orcid,
    orcid,
    name: display.displayName,
    image: normalizeProfileImageUrl(display.image),
    isAtlasProfile: display.isClaimed,
    attributionBadgeStatus: isSessionUploader
      ? "agreed"
      : researcherAttributionBadgeStatus({
          isClaimed: display.isClaimed,
          hasContributionAgreement: display.hasContributionAgreement,
        }),
    tooltipSubtitle: roleLabelsForDisplay(display.roles),
    avatarStackKey: display.stackKey,
  };
}

function ContributorAvatarPopover({
  display,
  sessionOrcid,
  rowsForOrcid,
  onRemove,
  avatar,
}: {
  display: AttributionAvatarDisplay;
  sessionOrcid: string | null;
  rowsForOrcid: DatasetAttributionEntry[];
  onRemove: (row: DatasetAttributionEntry) => void;
  avatar: ReactNode;
}) {
  const user = avatarDisplayToUser(display, sessionOrcid);
  const roleText = roleLabelsForDisplay(display.roles);

  return (
    <PopoverMenu
      align="start"
      placement="auto"
      renderTrigger={({ triggerProps, isOpen }) => (
        <button
          type="button"
          {...triggerProps}
          className={cn(
            "focus-visible:ring-accent inline-flex size-8 shrink-0 items-center justify-center rounded-full p-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            isOpen && "ring-accent ring-2 ring-offset-2",
          )}
          aria-label={`Attribution for ${display.displayName}`}
          title={`${display.displayName} - ${roleText}`}
        >
          {avatar}
        </button>
      )}
      renderContent={({ close, contentProps, contentPositionClassName }) => (
        <PopoverMenuContent
          {...contentProps}
          className={cn(
            contentPositionClassName,
            "border-border bg-surface w-64 rounded-lg border p-3 shadow-lg",
          )}
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CustomAvatar size="sm" user={user} />
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-semibold">
                  {display.displayName}
                </p>
                <p className="text-muted text-xs">{roleText}</p>
                <a
                  href={`https://orcid.org/${display.orcid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-accent mt-1 inline-flex items-center gap-1 font-mono text-xs tabular-nums"
                >
                  <ORCIDIcon
                    className="h-3 w-3 shrink-0"
                    authenticated={display.isClaimed}
                  />
                  {display.orcid}
                </a>
                {!display.isClaimed ? (
                  <p className="text-muted mt-1 text-xs">Unclaimed on Atlas</p>
                ) : null}
              </div>
            </div>
            <ul className="space-y-1">
              {rowsForOrcid.map((row) => (
                <li
                  key={row.clientId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="text-muted text-xs">
                    {contributorRoleLabel(row.role)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isDisabled={
                      isUploaderContributorRole(row.role) &&
                      row.orcid === sessionOrcid
                    }
                    onPress={() => {
                      onRemove(row);
                      close();
                    }}
                    aria-label={`Remove ${row.orcid} as ${row.role}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </PopoverMenuContent>
      )}
    />
  );
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

  const avatarUsers = useMemo(
    () => avatarDisplays.map((display) => avatarDisplayToUser(display, sessionOrcid)),
    [avatarDisplays, sessionOrcid],
  );

  const [orcidError, setOrcidError] = useState<string | null>(null);

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

  const handleRemove = useCallback(
    (row: DatasetAttributionEntry) => {
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
    },
    [],
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

  const displaysByOrcid = useMemo(() => {
    const map = new Map<string, AttributionAvatarDisplay>();
    for (const display of avatarDisplays) {
      map.set(display.orcid, display);
    }
    return map;
  }, [avatarDisplays]);

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
          <AvatarGroup
            key={avatarUsers.map((user) => user.avatarStackKey ?? user.orcid ?? user.id).join("|")}
            users={avatarUsers}
            size="sm"
            max={8}
            tooltipVariant="name"
            trailingSlot={addResearcherControl}
            wrapAvatarTrigger={({ user, avatar }) => {
              const orcidKey = user.orcid?.trim() ?? user.avatarStackKey?.trim();
              const display = orcidKey
                ? displaysByOrcid.get(orcidKey)
                : undefined;
              if (!display) {
                return (
                  <span className="inline-flex size-8 shrink-0 items-center justify-center">
                    {avatar}
                  </span>
                );
              }
              return (
                <ContributorAvatarPopover
                  display={display}
                  sessionOrcid={sessionOrcid}
                  rowsForOrcid={rowsByOrcid.get(display.orcid) ?? []}
                  onRemove={handleRemove}
                  avatar={avatar}
                />
              );
            }}
          />
        </div>
      </div>
      {orcidError && avatarDisplays.length > 0 ? (
        <ErrorMessage className="text-danger text-xs">{orcidError}</ErrorMessage>
      ) : null}
    </div>
  );
}
