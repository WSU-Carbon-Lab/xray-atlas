"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { cn } from "@heroui/styles";
import { ContributorAvatarGroup } from "~/components/attribution/contributor-avatar-group";
import {
  PopoverMenu,
  PopoverMenuContent,
} from "~/components/ui/popover-menu";
import {
  canAddBeamlineScientist,
  instrumentStewardsForAvatarDisplay,
  type InstrumentStewardPublic,
} from "~/lib/instrument-steward";
import { AddBeamlineScientistForm } from "./add-beamline-scientist-form";

type InstrumentBeamlineScientistAttributionRowProps = {
  facilityId: string;
  instrumentId: string;
  instrumentName: string;
  stewards: InstrumentStewardPublic[];
  claimIssueUrl: string;
};

/**
 * NEXAFS-style overlapping avatar row for beamline scientists with optional add control.
 */
export function InstrumentBeamlineScientistAttributionRow({
  facilityId,
  instrumentId,
  instrumentName,
  stewards,
  claimIssueUrl,
}: InstrumentBeamlineScientistAttributionRowProps) {
  const { data: session } = useSession();
  const canAdd = canAddBeamlineScientist({
    sessionUserId: session?.user?.id,
    canManageUsers: Boolean(session?.user?.canManageUsers),
    stewards,
  });
  const stewardAvatarUsers = useMemo(
    () => instrumentStewardsForAvatarDisplay(stewards),
    [stewards],
  );

  return (
    <div
      className="flex shrink-0 items-center gap-1 overflow-visible"
      role="group"
      aria-label={`Beamline scientists for ${instrumentName}`}
    >
      <a
        href={claimIssueUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:text-accent-dark shrink-0 text-sm font-medium underline-offset-2 hover:underline"
        aria-label={`Claim ${instrumentName} beamline on GitHub`}
      >
        Claim beamline
      </a>
      {stewardAvatarUsers.length > 0 ? (
        <ContributorAvatarGroup
          users={stewardAvatarUsers}
          size="sm"
          max={8}
        />
      ) : null}
      {canAdd ? (
        <PopoverMenu
          align="end"
          placement="auto"
          renderTrigger={({ triggerProps, isOpen }) => (
            <button
              type="button"
              {...triggerProps}
              className={cn(
                "border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground focus-visible:ring-accent inline-flex size-8 shrink-0 items-center justify-center rounded-full border p-0 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isOpen && "ring-accent ring-2 ring-offset-2",
              )}
              aria-label={`Add beamline scientist for ${instrumentName}`}
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
              <AddBeamlineScientistForm
                facilityId={facilityId}
                instrumentId={instrumentId}
                instrumentName={instrumentName}
                stewards={stewards}
                onClose={close}
              />
            </PopoverMenuContent>
          )}
        />
      ) : null}
    </div>
  );
}
