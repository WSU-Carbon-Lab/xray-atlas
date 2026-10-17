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
  /** Whether this pillar's view is currently expanded. */
  expanded: boolean;
  /** Id of the view region this tile expands. */
  controlsId: string;
  /** Roving tabindex: 0 for the toolbar's single tab stop, -1 otherwise. */
  tabIndex: 0 | -1;
  onFocus: (id: HomePillarId) => void;
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
  expanded,
  controlsId,
  tabIndex,
  onFocus,
  onSelect,
}: PillarTileProps): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      onFocus={() => onFocus(id)}
      aria-expanded={expanded}
      aria-controls={controlsId}
      tabIndex={tabIndex}
      data-home-pillar={id}
      style={{
        viewTransitionName: `home-tile-${id}`,
        viewTransitionClass: "home",
      }}
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
