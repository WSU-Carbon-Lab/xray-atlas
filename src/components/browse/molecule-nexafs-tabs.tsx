"use client";

import { BoltIcon } from "@heroicons/react/24/outline";

export function MoleculeNexafsTabs() {
  return (
    <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        <div
          className="border-accent text-accent dark:border-accent dark:text-accent-light inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium"
          aria-current="page"
        >
          <BoltIcon className="text-accent dark:text-accent-light mr-2 -ml-0.5 h-5 w-5" />
          NEXAFS
        </div>
      </nav>
    </div>
  );
}
