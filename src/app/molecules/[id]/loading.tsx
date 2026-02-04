import Link from "next/link";
import { MoleculeHeaderSkeleton } from "@/components/feedback/loading-state";

const PulsingCard = ({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={`animate-pulse rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 ${className}`}
  >
    {children}
  </div>
);

export default function MoleculeDetailLoading() {
  return (
    <div className="py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="hover:text-accent dark:hover:text-accent-light text-sm text-gray-600 dark:text-gray-400"
        >
          Back to Home
        </Link>
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
        <div className="flex w-full flex-wrap items-center justify-between gap-4 py-2">
          <div className="h-12 w-full max-w-[400px] animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          <div className="flex gap-2">
            <div className="h-12 w-20 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
            <div className="h-12 w-12 animate-pulse rounded-lg border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
          </div>
        </div>
        <div className="flex min-h-[140px] animate-pulse items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-white px-6 py-6 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-64 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="hidden h-16 w-16 animate-pulse rounded bg-gray-200 md:block dark:bg-gray-700" />
        </div>
        <div className="space-y-4">
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-3">
            <PulsingCard className="h-20 w-full p-4" />
            <PulsingCard className="h-20 w-full p-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
