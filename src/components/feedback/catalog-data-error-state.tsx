"use client";

import React from "react";
import {
  isDatabaseUnavailableError,
  resolveDatabaseErrorMessage,
} from "~/lib/database-unavailable";
import { DatabaseUnavailableState } from "./database-unavailable-state";
import { ErrorState } from "./error-state";

export type CatalogDataErrorStateProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
};

/**
 * Chooses {@link DatabaseUnavailableState} for catalog transport/database outages and
 * {@link ErrorState} for other query failures.
 */
export function CatalogDataErrorState({
  error,
  title = "Something went wrong",
  onRetry,
  compact = false,
  className,
}: CatalogDataErrorStateProps) {
  if (isDatabaseUnavailableError(error)) {
    return (
      <DatabaseUnavailableState
        onRetry={onRetry}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <ErrorState
      title={title}
      message={resolveDatabaseErrorMessage(error)}
      onRetry={onRetry}
    />
  );
}
