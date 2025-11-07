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
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-gray-200/40 bg-white shadow-lg sm:flex-row dark:border-gray-700/40 dark:bg-gray-800">
      {/* Image skeleton - Left side */}
      <div className="relative aspect-square w-full overflow-hidden sm:w-[45%]">
        <div className="absolute inset-4 overflow-hidden rounded-xl bg-gray-200/80 dark:bg-gray-700/50">
          <LoadingSkeleton className="h-full w-full rounded-xl" />
        </div>
      </div>

      {/* Content skeleton - Right side with Liquid Glass effect */}
      <div className="relative flex flex-1 flex-col bg-white/60 backdrop-blur-2xl sm:w-[55%] dark:bg-gray-800/60">
        <div className="absolute inset-0 rounded-r-2xl bg-gray-200/20 dark:bg-gray-700/20" />

        {/* Content */}
        <div className="relative flex flex-1 flex-col p-6">
          <div className="space-y-3">
            {/* Header skeleton */}
            <div className="space-y-2">
              <LoadingSkeleton className="h-8 w-3/4" />

              {/* Synonyms skeleton */}
              <div className="flex gap-2">
                <LoadingSkeleton className="h-6 w-16 rounded-full" />
                <LoadingSkeleton className="h-6 w-20 rounded-full" />
                <LoadingSkeleton className="h-6 w-14 rounded-full" />
              </div>

              {/* Formula skeleton */}
              <div className="flex items-baseline gap-3">
                <LoadingSkeleton className="h-3 w-12" />
                <LoadingSkeleton className="h-5 w-24" />
              </div>
            </div>
          </div>

          {/* Actions skeleton */}
          <div className="mt-2.5 space-y-2 border-t border-gray-200/20 pt-2.5 dark:border-gray-700/20">
            <div className="flex flex-wrap items-center gap-2">
              <LoadingSkeleton className="h-8 w-20 rounded-full" />
              <LoadingSkeleton className="h-8 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LoadingSkeleton className="h-8 w-20 rounded-full" />
              <LoadingSkeleton className="h-8 w-16 rounded-full" />
            </div>
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
    <div
      className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${className}`}
    >
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
