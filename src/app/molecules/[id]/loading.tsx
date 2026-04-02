import Link from "next/link";
import { MoleculeHeaderSkeleton } from "@/components/feedback/loading-state";

export default function MoleculeDetailLoading() {
  return (
    <div className="py-8">
      <div className="mb-6">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-600 dark:text-gray-400">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link
                href="/"
                className="hover:text-accent dark:hover:text-accent-light"
              >
                Home
              </Link>
            </li>
            <li aria-hidden className="text-gray-400 dark:text-gray-600">
              /
            </li>
            <li>
              <Link
                href="/browse"
                className="hover:text-accent dark:hover:text-accent-light"
              >
                Browse
              </Link>
            </li>
            <li aria-hidden className="text-gray-400 dark:text-gray-600">
              /
            </li>
            <li>
              <Link
                href="/browse/molecules"
                className="hover:text-accent dark:hover:text-accent-light"
              >
                Molecules
              </Link>
            </li>
            <li aria-hidden className="text-gray-400 dark:text-gray-600">
              /
            </li>
            <li>
              <div className="h-4 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </li>
          </ol>
        </nav>
      </div>
      <div className="mb-8">
        <MoleculeHeaderSkeleton />
      </div>
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <div className="h-10 w-28 animate-pulse rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        </nav>
      </div>
      <div className="space-y-6">
        <div className="flex w-full flex-wrap items-center gap-3 sm:flex-wrap">
          <div className="h-12 max-w-md min-w-[12rem] flex-1 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          <div className="h-12 w-28 shrink-0 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          <div className="h-12 w-24 shrink-0 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          <div className="h-12 w-28 shrink-0 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="border-border bg-surface h-32 animate-pulse rounded-xl border shadow-lg dark:border-gray-700"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
