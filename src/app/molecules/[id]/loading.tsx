import {
  LoadingSkeleton,
  MoleculeCardSkeleton,
} from "@/components/feedback/loading-state";

export default function MoleculeDetailLoading() {
  return (
    <div className="py-8">
      <div className="mb-6">
        <LoadingSkeleton className="h-4 w-24 rounded" />
      </div>
      <div className="mb-8">
        <MoleculeCardSkeleton />
      </div>
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
        <div className="-mb-px flex space-x-8">
          <LoadingSkeleton className="h-10 w-28 rounded" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 py-2">
          <LoadingSkeleton className="h-12 w-full max-w-[400px] rounded-lg" />
          <div className="flex gap-2">
            <LoadingSkeleton className="h-12 w-20 rounded-lg" />
            <LoadingSkeleton className="h-12 w-12 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <LoadingSkeleton className="min-h-[220px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
