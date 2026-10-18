"use client";

import type { ReactElement } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import type { HomeStageId } from "../snapshot/types";

export interface PillarTileProps {
  id: HomeStageId;
  title: string;
  /** Sentence under the feature name. */
  description: string;
  selected: boolean;
  /** Id of the hero region this line describes. */
  controlsId: string;
  /** Roving tabindex: 0 for the selected line, -1 otherwise. */
  tabIndex: 0 | -1;
  onSelect: (id: HomeStageId) => void;
}

/**
 * One home feature: a display name, the arrow, then one sentence.
 *
 * The selected name is foreground and its arrow is visible. Other names stay
 * quiet until hover or focus, when the arrow eases in.
 */
export function PillarTile({
  id,
  title,
  description,
  selected,
  controlsId,
  tabIndex,
  onSelect,
}: PillarTileProps): ReactElement {
  return (
    <button
      type="button"
      id={`home-theme-${id}`}
      role="tab"
      onClick={() => onSelect(id)}
      aria-selected={selected}
      aria-controls={controlsId}
      tabIndex={tabIndex}
      data-home-pillar={id}
      className="group w-full py-3 text-left"
    >
      <span className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-display text-3xl leading-none font-normal tracking-tight sm:text-4xl lg:text-5xl",
            selected
              ? "text-foreground"
              : "text-muted group-hover:text-foreground",
          )}
        >
          {title}
        </span>
        <ArrowRightIcon
          className={cn(
            "size-6 shrink-0 transition-transform sm:size-7 lg:size-8",
            selected
              ? "translate-x-0 opacity-100"
              : "opacity-0 group-hover:translate-x-1 group-hover:opacity-60 group-focus-visible:translate-x-1 group-focus-visible:opacity-60",
          )}
          aria-hidden
        />
      </span>
      <span className="text-muted mt-2 block max-w-sm text-sm leading-6">
        {description}
      </span>
    </button>
  );
}
