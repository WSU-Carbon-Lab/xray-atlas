"use client";

import React from "react";

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  );
}

export function MoleculeCardSkeleton() {
  return (
    <div className="border-border-default dark:border-border-default flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm sm:flex-row dark:bg-zinc-800">
      <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:min-h-[240px] sm:w-[45%]">
        <LoadingSkeleton className="h-full w-full rounded-none" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <LoadingSkeleton className="h-6 w-3/5 rounded" />
          <LoadingSkeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <LoadingSkeleton className="h-5 w-14 rounded-full" />
          <LoadingSkeleton className="h-5 w-16 rounded-full" />
          <LoadingSkeleton className="h-5 w-12 rounded-full" />
        </div>
        <LoadingSkeleton className="h-3 w-full max-w-sm rounded" />
        <div className="flex flex-wrap items-center gap-2">
          <LoadingSkeleton className="h-6 w-6 rounded-full" />
          <LoadingSkeleton className="h-8 w-20 rounded-lg" />
          <LoadingSkeleton className="h-8 w-16 rounded-lg" />
          <LoadingSkeleton className="h-8 w-8 rounded-lg" />
          <LoadingSkeleton className="h-8 w-8 rounded-lg" />
        </div>
        <div className="border-border-subtle mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-3">
            <LoadingSkeleton className="h-3.5 w-8 rounded" />
            <div className="flex items-center gap-1">
              <LoadingSkeleton className="h-3.5 w-3.5 rounded" />
              <LoadingSkeleton className="h-3.5 w-6 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LoadingSkeleton className="h-5 w-16 rounded-full" />
            <LoadingSkeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MoleculeGridSkeleton({
  count = 8,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <MoleculeCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SearchInputSkeleton() {
  return (
    <div className="w-full max-w-2xl">
      <LoadingSkeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="space-y-4">
          <LoadingSkeleton className="h-12 w-64" />
          <LoadingSkeleton className="h-6 w-96" />
        </div>
        <MoleculeGridSkeleton />
      </div>
    </div>
  );
}
