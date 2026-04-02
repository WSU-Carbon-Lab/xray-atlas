"use client";

import React from "react";
import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "../ui/button";

function sanitizePublicErrorMessage(message: string | undefined): string {
  if (!message?.trim()) {
    return "Something went wrong. Please try again.";
  }
  const m = message;
  if (
    /\bprisma\b/i.test(m) ||
    /\$queryRaw/i.test(m) ||
    /\bpostgres\b/i.test(m) ||
    /\bTRPCError\b/i.test(m) ||
    /Invalid `/i.test(m) ||
    /Raw query failed/i.test(m) ||
    /Code:\s*`?\d+`?/i.test(m) ||
    /subquery uses ungrouped column/i.test(m) ||
    /ERROR:/i.test(m)
  ) {
    return "We could not load this data. Please try again in a moment.";
  }
  return m;
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  exposeTechnicalDetails?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "Try again",
  exposeTechnicalDetails = false,
}: ErrorStateProps) {
  const displayMessage = exposeTechnicalDetails
    ? message
    : sanitizePublicErrorMessage(message);

  return (
    <div className="border-border bg-surface flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border p-8 shadow-sm">
      <ExclamationTriangleIcon className="text-danger h-12 w-12" aria-hidden />
      <div className="text-center">
        <h3 className="text-foreground text-lg font-semibold">{title}</h3>
        <p className="text-muted mt-2 max-w-md text-sm leading-relaxed">{displayMessage}</p>
      </div>
      {onRetry ? (
        <Button onPress={onRetry} variant="outline">
          <ArrowPathIcon className="h-4 w-4" />
          <span>{retryLabel}</span>
        </Button>
      ) : null}
    </div>
  );
}

export function NotFoundState({
  title = "Not Found",
  message = "The requested resource could not be found.",
}: {
  title?: string;
  message?: string;
}) {
  return <ErrorState title={title} message={message} />;
}
