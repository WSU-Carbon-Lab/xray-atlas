"use client";

import { CheckBadgeIcon, CheckIcon } from "@heroicons/react/24/outline";
import { Tooltip } from "@heroui/react";
import { cn } from "@heroui/styles";
import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";
import { BrowseFilterTrigger } from "./browse-filter-trigger";
import type { VerificationSource } from "./nexafs-browse-experiment-utils";
import {
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_SOURCE_OPTIONS,
} from "./nexafs-filter-options";

export type { VerificationSource };

export interface NexafsVerificationFilterDropdownProps {
  verifiedOnly: boolean;
  verificationSource: VerificationSource;
  onVerifiedOnlyChange: (value: boolean) => void;
  onVerificationSourceChange: (source: VerificationSource) => void;
}

/**
 * Filter trigger for NEXAFS experiment verification status.
 *
 * Renders a toggle for "only verified datasets" and a radio-style sub-group
 * for the verification source (`"either"`, `"publication"`, or `"atlas"`).
 * The source sub-group is disabled while `verifiedOnly` is false.
 *
 * @param verifiedOnly - Whether the verified-only constraint is active.
 * @param verificationSource - Which source of verification to require.
 * @param onVerifiedOnlyChange - Called when the user toggles the verified-only flag.
 * @param onVerificationSourceChange - Called when the user selects a new source.
 */
export function NexafsVerificationFilterDropdown({
  verifiedOnly,
  verificationSource,
  onVerifiedOnlyChange,
  onVerificationSourceChange,
}: NexafsVerificationFilterDropdownProps) {
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="inline-flex shrink-0">
        <PopoverMenu
          align="end"
          contentClassName="w-[min(100vw-2rem,320px)]"
          renderTrigger={({ triggerProps, isOpen }) => (
            <BrowseFilterTrigger
              {...triggerProps}
              aria-label={`Verification filter; current ${verifiedOnly ? VERIFICATION_SOURCE_LABELS[verificationSource] : "all datasets"}`}
              aria-pressed={verifiedOnly}
              active={verifiedOnly}
              icon={<CheckBadgeIcon aria-hidden />}
              label="Verified"
            >
              <span className="sr-only">
                {isOpen
                  ? "Close verification filter"
                  : "Open verification filter"}
              </span>
            </BrowseFilterTrigger>
          )}
          renderContent={({ contentPositionClassName, contentProps, close }) => (
            <PopoverMenuContent
              {...contentProps}
              className={`${contentPositionClassName} w-[min(100vw-2rem,320px)] rounded-xl py-1`}
            >
              <div className="space-y-2 p-2">
                <button
                  type="button"
                  onClick={() => {
                    onVerifiedOnlyChange(!verifiedOnly);
                  }}
                  className={cn(
                    "focus-visible:ring-accent flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2",
                    verifiedOnly
                      ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                      : "text-muted hover:bg-default hover:text-foreground",
                  )}
                >
                  <span className="font-medium">Only verified datasets</span>
                  {verifiedOnly ? (
                    <CheckIcon
                      className="text-accent h-4 w-4 shrink-0"
                      aria-hidden
                    />
                  ) : null}
                </button>
                <div className="border-border-default space-y-1 rounded-md border p-1">
                  {VERIFICATION_SOURCE_OPTIONS.map(
                    (option) => {
                      const selected = verificationSource === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={!verifiedOnly}
                          onClick={() => {
                            onVerificationSourceChange(option);
                            close();
                          }}
                          className={cn(
                            "focus-visible:ring-accent flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2",
                            !verifiedOnly
                              ? "text-zinc-500/70"
                              : selected
                                ? "bg-accent-soft text-foreground ring-accent/35 ring-1"
                                : "text-muted hover:bg-default hover:text-foreground",
                          )}
                        >
                          <span>{VERIFICATION_SOURCE_LABELS[option]}</span>
                          {verifiedOnly && selected ? (
                            <CheckIcon
                              className="text-accent h-4 w-4 shrink-0"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </PopoverMenuContent>
          )}
        />
      </Tooltip.Trigger>
      <Tooltip.Content
        placement="top"
        className="bg-foreground text-background max-w-xs rounded-lg px-3 py-2 text-left shadow-lg"
      >
        Limit results to datasets verified by Atlas staff or linked to a
        third-party publication.
      </Tooltip.Content>
    </Tooltip>
  );
}
