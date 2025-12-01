"use client";

import React from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";

interface SynonymsListProps {
  /** Synonyms to display as badges (usually filtered/sorted subset) */
  synonyms: string[];
  /** All synonyms to show in the popover modal (if different from synonyms prop) */
  allSynonyms?: string[];
  /** Maximum number of synonyms to display as badges before showing popover */
  maxDisplay?: number;
  /** Custom className for the container */
  className?: string;
  /** Custom className for individual synonym badges */
  badgeClassName?: string;
  /** Variant style for badges */
  variant?: "default" | "liquid-glass" | "compact";
}

/**
 * Reusable component for displaying synonyms with badges and a popover modal
 * Shows up to maxDisplay synonyms as badges, then a "+X" button that opens a popover with all synonyms
 * Constrains all synonyms and the "+X" button to a single line, truncating the last synonym if needed
 */
export const SynonymsList = ({
  synonyms,
  allSynonyms,
  maxDisplay = 5,
  className = "",
  badgeClassName = "",
  variant = "default",
}: SynonymsListProps) => {
  if (synonyms.length === 0) return null;

  // Use allSynonyms for popover if provided, otherwise use synonyms
  const popoverSynonyms = allSynonyms ?? synonyms;

  // Get synonyms to display as badges
  const displayedSynonyms = synonyms.slice(0, maxDisplay);
  const remainingCount = popoverSynonyms.length - displayedSynonyms.length;

  // Variant-based default styles
  const getBadgeStyles = () => {
    switch (variant) {
      case "liquid-glass":
        return "rounded-full bg-gray-100/80 px-3 py-1 text-xs font-medium text-gray-700 backdrop-blur-sm dark:bg-gray-700/80 dark:text-gray-300";
      case "compact":
        return "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const badgeClass = badgeClassName || getBadgeStyles();

  return (
    <div
      className={`flex flex-nowrap items-center gap-2 overflow-hidden ${className}`}
    >
      {displayedSynonyms.map((name, idx) => {
        // Allow the last synonym to truncate if needed to keep everything on one line
        const isLast = idx === displayedSynonyms.length - 1;
        const shouldTruncate = isLast;

        return (
          <span
            key={`${name}-${idx}`}
            className={`${badgeClass} ${shouldTruncate ? "max-w-[200px] min-w-0 shrink overflow-hidden" : "shrink-0"}`}
            title={shouldTruncate && name.length > 20 ? name : undefined}
          >
            {shouldTruncate ? (
              <span className="block truncate">{name}</span>
            ) : (
              name
            )}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <div className="shrink-0">
          <SynonymsPopover
            synonyms={popoverSynonyms}
            displayedCount={displayedSynonyms.length}
          />
        </div>
      )}
    </div>
  );
};

/**
 * Popover component that displays all synonyms in a modal
 */
const SynonymsPopover = ({
  synonyms,
  displayedCount,
}: {
  synonyms: string[];
  displayedCount: number;
}) => {
  const remainingSynonyms = synonyms.slice(displayedCount);

  if (remainingSynonyms.length === 0) return null;

  return (
    <Popover className="relative flex shrink-0 items-center">
      <PopoverButton className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600">
        +{remainingSynonyms.length}
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        className="z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          All Synonyms ({synonyms.length})
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {synonyms.map((synonym, idx) => (
            <div
              key={idx}
              className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {synonym}
            </div>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
};
