"use client";

import React from "react";
import { ArrowPathIcon, SignalSlashIcon } from "@heroicons/react/24/outline";
import {
  DATABASE_UNAVAILABLE_TITLE,
  databaseUnavailableMessage,
} from "~/lib/database-unavailable";
import { DefaultButton as Button } from "../ui/button";
import { cn } from "@heroui/styles";

export type DatabaseUnavailableStateProps = {
  /** Optional retry handler; typically refetch or invalidate affected queries. */
  onRetry?: () => void;
  /** Uses a denser layout for panels, dropdowns, and footers. */
  compact?: boolean;
  /** Extra classes on the outer shell. */
  className?: string;
  /** Overrides the default outage title. */
  title?: string;
  /** Overrides the default outage message. */
  message?: string;
};

/**
 * Inline degraded-state surface for catalog components when Supabase/Postgres is unreachable.
 * Voice and tokens align with the beam-dump error page without occupying the full viewport.
 */
export function DatabaseUnavailableState({
  onRetry,
  compact = false,
  className,
  title = DATABASE_UNAVAILABLE_TITLE,
  message = databaseUnavailableMessage,
}: DatabaseUnavailableStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "border-border bg-surface flex flex-col items-center justify-center rounded-xl border text-center shadow-sm",
        compact ? "gap-3 px-4 py-6" : "min-h-[280px] gap-4 p-8",
        className,
      )}
    >
      <SignalSlashIcon
        className={cn("text-warning shrink-0", compact ? "h-8 w-8" : "h-12 w-12")}
        aria-hidden
      />
      <div className="space-y-2">
        <p className="text-accent font-mono text-[0.65rem] font-semibold tracking-[0.24em] uppercase">
          Database
        </p>
        <h3
          className={cn(
            "text-foreground font-semibold tracking-tight",
            compact ? "text-base" : "text-lg",
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            "text-muted mx-auto max-w-md leading-relaxed",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {message}
        </p>
      </div>
      {onRetry ? (
        <Button onPress={onRetry} variant="outline" size={compact ? "sm" : "md"}>
          <ArrowPathIcon className="h-4 w-4" aria-hidden />
          <span>Try again</span>
        </Button>
      ) : null}
    </div>
  );
}
