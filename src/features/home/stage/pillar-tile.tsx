"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@heroui/styles";
import type { HomePillarId } from "../snapshot/types";

export interface PillarTileProps {
  id: HomePillarId;
  kicker: string;
  title: string;
  summary: string;
  preview: ReactNode;
  compact: boolean;
  onSelect: (id: HomePillarId) => void;
}

/** Overview or rail tile for one pillar; a button that expands that pillar. */
export function PillarTile({
  id,
  kicker,
  title,
  summary,
  preview,
  compact,
  onSelect,
}: PillarTileProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      data-home-pillar={id}
      style={{ viewTransitionName: `home-tile-${id}` }}
      className={cn("home-tile group", compact && "home-tile--compact")}
    >
      <span className="home-kicker">{kicker}</span>
      <span className="font-display text-foreground text-xl font-semibold tracking-tight">
        {title}
      </span>
      {!compact && (
        <span className="text-muted text-sm leading-6">{summary}</span>
      )}
      <span className="home-tile__preview" aria-hidden>
        {preview}
      </span>
    </button>
  );
}
