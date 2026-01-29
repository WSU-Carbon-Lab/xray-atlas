"use client";

import React from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
  onRetry,
  retryLabel = "Try Again",
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button onPress={onRetry} variant="outline">
          {retryLabel}
        </Button>
      )}
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
  return (
    <ErrorState
      title={title}
      message={message}
      retryLabel={undefined}
    />
  );
}
