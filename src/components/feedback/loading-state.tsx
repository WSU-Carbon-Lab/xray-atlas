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
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-600">
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

export function MoleculeCompactSkeleton() {
  return (
    <div className="border-border-default dark:border-border-default flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 p-3 shadow-sm md:flex-row md:items-center md:gap-4 dark:bg-zinc-800">
      <div className="flex shrink-0 items-center gap-4 md:flex-row">
        <LoadingSkeleton className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 md:w-40 md:flex-initial">
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="mt-1 h-3 w-16" />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 md:mt-0 md:flex-1 md:items-center md:gap-4">
        <LoadingSkeleton className="h-5 w-14 rounded-full" />
        <LoadingSkeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-2 flex shrink-0 items-center gap-4 border-t border-gray-200 pt-3 md:mt-0 md:border-t-0 md:border-l md:pt-0 md:pl-6 dark:border-gray-700">
        <LoadingSkeleton className="h-6 w-6 rounded-full" />
        <LoadingSkeleton className="h-3.5 w-8" />
        <LoadingSkeleton className="h-3.5 w-6" />
      </div>
    </div>
  );
}

export function MoleculeGridSkeleton({
  count = 8,
  className = "",
  variant = "full",
}: {
  count?: number;
  className?: string;
  variant?: "full" | "compact";
}) {
  const Skeleton =
    variant === "compact" ? MoleculeCompactSkeleton : MoleculeCardSkeleton;
  return (
    <div
      className={
        variant === "compact"
          ? `w-full space-y-3 ${className}`
          : `grid w-full grid-cols-1 gap-6 lg:grid-cols-2 ${className}`
      }
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} />
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
