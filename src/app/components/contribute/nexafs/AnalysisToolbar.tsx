"use client";

import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/app/components/Button";

interface AnalysisToolbarProps {
  hasMolecule: boolean;
  hasData: boolean;
  hasNormalization: boolean;
  normalizationLocked: boolean;
  onPreEdgeSelect: () => void;
  onPostEdgeSelect: () => void;
  onToggleLock: () => void;
  onIdentifyPeaks: () => void;
  isSelectingPreEdge: boolean;
  isSelectingPostEdge: boolean;
}

export function AnalysisToolbar({
  hasMolecule,
  hasData,
  hasNormalization,
  normalizationLocked,
  onPreEdgeSelect,
  onPostEdgeSelect,
  onToggleLock,
  onIdentifyPeaks,
  isSelectingPreEdge,
  isSelectingPostEdge,
}: AnalysisToolbarProps) {
  return (
    <div className="w-64 shrink-0 space-y-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Analysis Tools
        </h3>

        {/* Normalize Section */}
        <div className="mb-6 space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Normalize
          </div>
          <div className="space-y-2">
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={onPreEdgeSelect}
              disabled={!hasMolecule || !hasData}
              className={`w-full justify-start ${
                isSelectingPreEdge
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                  : ""
              }`}
            >
              Pre Edge
            </Button>
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={onPostEdgeSelect}
              disabled={!hasMolecule || !hasData}
              className={`w-full justify-start ${
                isSelectingPostEdge
                  ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : ""
              }`}
            >
              Post Edge
            </Button>
            <Button
              type="button"
              variant="bordered"
              size="sm"
              onClick={onToggleLock}
              disabled={!hasNormalization}
              className="w-full justify-start"
            >
              {normalizationLocked ? (
                <>
                  <LockClosedIcon className="mr-2 h-4 w-4" />
                  Unlock
                </>
              ) : (
                <>
                  <LockOpenIcon className="mr-2 h-4 w-4" />
                  Lock
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Peak Analysis Section */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Peak Analysis
          </div>
          <Button
            type="button"
            variant="bordered"
            size="sm"
            onClick={onIdentifyPeaks}
            disabled={!hasData}
            className="w-full justify-start"
          >
            Identify Peaks
          </Button>
        </div>
      </div>
    </div>
  );
}
