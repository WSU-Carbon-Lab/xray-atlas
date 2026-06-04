"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { Trash2 } from "lucide-react";
import { ORCIDIcon } from "~/components/icons";
import {
  ResearcherAvatar,
  normalizeProfileImageUrl,
  type ContributorHoverRemoveRow,
  type UserWithOrcid,
} from "~/components/ui/avatar";

export type ContributorHoverCardProps = {
  user: UserWithOrcid;
  arrowOffsetPx?: number;
  showArrow?: boolean;
  removeRows?: ReadonlyArray<ContributorHoverRemoveRow>;
  onRemoveRow?: (rowKey: string) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

function userDisplayName(user: UserWithOrcid): string {
  return user.name ?? "User";
}

function userOrcid(user: UserWithOrcid): string | null {
  const value = user.orcid?.trim() ?? user.id?.trim();
  return value && value.length > 0 ? value : null;
}

function identitySeed(user: UserWithOrcid): string {
  return (
    user.orcid?.trim() ??
    user.id?.trim() ??
    user.avatarStackKey?.trim() ??
    user.name?.trim() ??
    ""
  );
}

/**
 * Portaled hover panel for a single contributor: avatar, name, role, ORCID link, and optional per-role remove actions.
 */
export function ContributorHoverCard({
  user,
  arrowOffsetPx = 0,
  showArrow = true,
  removeRows,
  onRemoveRow,
  onMouseEnter,
  onMouseLeave,
}: ContributorHoverCardProps) {
  const name = userDisplayName(user);
  const orcidValue = userOrcid(user);
  const roleLabel =
    user.hoverRoleLabel?.trim() ??
    user.tooltipSubtitle?.trim() ??
    null;
  const showOrcidOnlyName =
    user.isAtlasProfile === false && Boolean(orcidValue) && name === orcidValue;
  const imageUrl = normalizeProfileImageUrl(user.image);
  const showRemove =
    removeRows != null &&
    removeRows.length > 0 &&
    typeof onRemoveRow === "function";

  return (
    <div
      className="border-border bg-surface relative w-[min(16rem,calc(100vw-1rem))] rounded-2xl border px-3 py-2.5 shadow-lg"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-start gap-2">
        <ResearcherAvatar
          displayName={showOrcidOnlyName ? orcidValue ?? name : name}
          imageUrl={imageUrl}
          identitySeed={identitySeed(user)}
          isAtlasProfile={user.isAtlasProfile ?? Boolean(user.id?.trim())}
          placeholder={
            user.avatarPlaceholder ??
            (user.isAtlasProfile !== false ? "initials" : "person")
          }
          attributionBadgeStatus={user.attributionBadgeStatus}
          size="sm"
          className="h-8 w-8 shrink-0"
        />
        <div className="min-w-0 flex-1">
          {user.id && !showOrcidOnlyName ? (
            <Link
              href={`/users/${user.id}`}
              className="text-foreground focus-visible:ring-accent block truncate rounded-sm text-sm font-semibold transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label={`View ${name}'s profile`}
              title={name}
            >
              {name}
            </Link>
          ) : (
            <p
              className="text-foreground truncate text-sm font-semibold"
              title={name}
            >
              {showOrcidOnlyName ? (
                <span className="text-muted font-mono text-xs tabular-nums">
                  {orcidValue}
                </span>
              ) : (
                name
              )}
            </p>
          )}
          {roleLabel ? (
            <p className="text-muted truncate text-xs">{roleLabel}</p>
          ) : null}
          {orcidValue ? (
            <a
              href={`https://orcid.org/${orcidValue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent focus-visible:ring-accent mt-1 inline-flex min-w-0 items-center gap-1 rounded-sm font-mono text-xs tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              aria-label={`Open ORCID profile ${orcidValue}`}
              title={orcidValue}
            >
              <ORCIDIcon
                className="h-3 w-3 shrink-0"
                authenticated={
                  user.attributionBadgeStatus === "agreed" ||
                  user.isAtlasProfile === true
                }
              />
              <span className="min-w-0 truncate">{orcidValue}</span>
            </a>
          ) : (
            <p className="text-muted mt-1 inline-flex min-w-0 items-center gap-1 font-mono text-xs tabular-nums">
              <ORCIDIcon className="h-3 w-3 shrink-0 opacity-70" authenticated />
              <span className="min-w-0 truncate">Not linked</span>
            </p>
          )}
          {user.attributionBadgeStatus === "unclaimed" ? (
            <p className="text-muted mt-1 text-xs">Unclaimed on Atlas</p>
          ) : null}
        </div>
      </div>
      {showRemove ? (
        <ul className="border-border mt-2 space-y-1 border-t pt-2">
          {removeRows.map((row) => (
            <li
              key={row.rowKey}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-muted text-xs">{row.roleLabel}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isDisabled={row.removeDisabled}
                onPress={() => onRemoveRow(row.rowKey)}
                aria-label={`Remove ${row.roleLabel}`}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {showArrow ? (
        <div
          className="border-border bg-surface absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b transition-[left] duration-150 ease-out"
          style={{ left: `calc(50% + ${arrowOffsetPx}px)` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
