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
    <div className="flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {/* Image skeleton */}
      <LoadingSkeleton className="aspect-square w-full rounded-lg" />

      {/* Content skeleton */}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* Name skeleton */}
        <div className="space-y-1.5">
          <LoadingSkeleton className="h-6 w-3/4" />
          <div className="flex gap-1.5">
            <LoadingSkeleton className="h-5 w-20 rounded-full" />
            <LoadingSkeleton className="h-5 w-24 rounded-full" />
          </div>
          <LoadingSkeleton className="h-4 w-1/2" />
        </div>

        {/* Buttons skeleton */}
        <div className="flex flex-wrap items-center gap-2">
          <LoadingSkeleton className="h-7 w-20 rounded-lg" />
          <LoadingSkeleton className="h-7 w-20 rounded-lg" />
          <LoadingSkeleton className="h-7 w-24 rounded-full" />
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
      className={`grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
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
