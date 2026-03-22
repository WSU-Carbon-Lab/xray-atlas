"use client";

import { PlusIcon } from "@heroicons/react/24/outline";

type AddDatasetButtonProps = {
  onAdd: () => void;
};

export function AddDatasetButton({ onAdd }: AddDatasetButtonProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group hover:border-accent hover:text-accent dark:hover:text-accent-light focus:ring-accent/30 dark:hover:border-accent-light dark:hover:text-accent-light flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white/80 px-4 py-3 text-left text-gray-700 transition-all hover:bg-white focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-200"
    >
      <span className="group-hover:bg-accent/10 group-hover:text-accent dark:group-hover:text-accent-light flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition dark:bg-gray-700 dark:text-gray-200">
        <PlusIcon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold">Add Experiment Dataset</p>
        <p className="text-sm text-gray-500 group-hover:text-current dark:text-gray-400">
          Capture a new geometry, instrument, and spectrum set.
        </p>
      </div>
    </button>
  );
}
