"use client";

import { ChartBarIcon } from "@heroicons/react/24/outline";

type AddNexafsCardProps = {
  className?: string;
};

export function AddNexafsCard({ className = "" }: AddNexafsCardProps) {
  return (
    <div
      role="presentation"
      className={`group border-border-default hover:border-border-strong relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border bg-zinc-50 px-6 py-6 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-zinc-800 ${className}`}
    >
      <div className="flex flex-col gap-2">
        <span className="text-accent dark:text-accent-light text-sm font-semibold tracking-wide uppercase">
          ADD NEXAFS
        </span>
        <span className="text-base text-gray-700 transition-colors duration-200 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
          Upload a NEXAFS spectrum for this molecule.
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Share a new spectrum with the community.
        </span>
      </div>
      <div className="group-hover:text-accent dark:text-accent-light hidden shrink-0 text-gray-300 transition-colors duration-200 md:block">
        <ChartBarIcon className="h-16 w-16" aria-hidden />
      </div>
    </div>
  );
}
