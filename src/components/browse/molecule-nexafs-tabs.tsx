"use client";

import { BoltIcon } from "@heroicons/react/24/outline";

export function MoleculeNexafsTabs() {
  return (
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        <div
          className="inline-flex items-center border-b-2 border-accent px-1 py-4 text-sm font-medium text-accent dark:border-accent dark:text-accent-light"
          aria-current="page"
        >
          <BoltIcon className="-ml-0.5 mr-2 h-5 w-5 text-accent dark:text-accent-light" />
          NEXAFS
        </div>
      </nav>
    </div>
  );
}
