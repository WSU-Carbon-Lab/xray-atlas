"use client";

/**
 * Molecule-scoped list of similar editable experiment pairs with merge entry.
 */

import { useEffect, useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { useSession } from "next-auth/react";
import type { DatasetSimilarPair } from "~/lib/nexafs/dataset-similarity";
import {
  loadDismissedSimilarPairKeys,
  persistDismissedSimilarPair,
  similarPairDismissalKey,
} from "~/lib/nexafs/similar-pair-dismissal";
import { DatasetMergeModal } from "~/features/process-nexafs/ui/dataset-merge-modal";
import { pathnameWithoutMergePairDeepLink } from "~/lib/nexafs-experiment-deep-link";
import { trpc } from "~/trpc/client";

const EMPTY_SIMILAR_PAIRS: DatasetSimilarPair[] = [];

export interface MoleculeSimilarDatasetsPanelProps {
  /** Molecule UUID. */
  moleculeId: string;
  /** Preferred molecule slug for deep links after merge. */
  moleculeSlug?: string | null;
  /** Optional pair to open immediately (`aId`, `bId`). */
  initialMergePair?: { aId: string; bId: string } | null;
}

/**
 * Renders similar-dataset pairs the session can edit on both sides, with a
 * merge review action.
 */
export function MoleculeSimilarDatasetsPanel({
  moleculeId,
  moleculeSlug,
  initialMergePair = null,
}: MoleculeSimilarDatasetsPanelProps) {
  const { status } = useSession();
  const utils = trpc.useUtils();
  const enabled = status === "authenticated" && Boolean(moleculeId);

  const pairsQuery = trpc.experiments.listSimilarPairsForMolecule.useQuery(
    { moleculeId },
    { enabled, staleTime: 30_000 },
  );

  const [activePair, setActivePair] = useState<DatasetSimilarPair | null>(null);
  const [openedInitial, setOpenedInitial] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const pairs = pairsQuery.data?.pairs ?? EMPTY_SIMILAR_PAIRS;
  const visiblePairs = useMemo(
    () =>
      pairs.filter(
        (pair) =>
          !dismissedKeys.has(similarPairDismissalKey(pair.aId, pair.bId)),
      ),
    [dismissedKeys, pairs],
  );

  useEffect(() => {
    setDismissedKeys(loadDismissedSimilarPairKeys());
  }, []);

  const clearMergePairFromUrl = () => {
    if (typeof window === "undefined") {
      return;
    }
    const next = pathnameWithoutMergePairDeepLink(
      window.location.pathname,
      window.location.search,
    );
    if (next != null) {
      window.history.replaceState(null, "", next);
    }
  };

  useEffect(() => {
    if (openedInitial || !initialMergePair || visiblePairs.length === 0) {
      return;
    }
    const match = visiblePairs.find(
      (pair) =>
        (pair.aId === initialMergePair.aId &&
          pair.bId === initialMergePair.bId) ||
        (pair.aId === initialMergePair.bId &&
          pair.bId === initialMergePair.aId),
    );
    if (match) {
      setActivePair(match);
      setOpenedInitial(true);
    }
  }, [initialMergePair, openedInitial, visiblePairs]);

  if (!enabled || pairsQuery.isLoading) {
    return null;
  }
  if (visiblePairs.length === 0) {
    return null;
  }

  return (
    <section
      className="border-border bg-surface rounded-xl border p-4 shadow-sm"
      aria-label="Similar datasets"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-foreground text-base font-semibold">
          Similar datasets
        </h2>
        <p className="text-muted text-sm">
          Same detection mode and overlapping geometries you can edit on both
          sides
        </p>
      </div>
      <ul className="space-y-2">
        {visiblePairs.map((pair) => {
          const labelA = pair.aSlug ?? pair.aId.slice(0, 8);
          const labelB = pair.bSlug ?? pair.bId.slice(0, 8);
          return (
            <li
              key={`${pair.aId}:${pair.bId}`}
              className="border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-medium">
                  {labelA}
                  <span className="text-muted mx-2 font-normal">vs</span>
                  {labelB}
                </p>
                <p className="text-muted text-xs">
                  {pair.minEvA.toFixed(1)}–{pair.maxEvA.toFixed(1)} eV /{" "}
                  {pair.minEvB.toFixed(1)}–{pair.maxEvB.toFixed(1)} eV
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="soft" color="accent">
                  {pair.percent}% similar
                </Chip>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => setActivePair(pair)}
                >
                  Review merge
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {activePair ? (
        <DatasetMergeModal
          isOpen
          pair={activePair}
          moleculeId={moleculeId}
          moleculeSlug={moleculeSlug ?? null}
          onClose={() => {
            clearMergePairFromUrl();
            setActivePair(null);
          }}
          onDismissAsUnique={() => {
            setDismissedKeys(
              persistDismissedSimilarPair(activePair.aId, activePair.bId),
            );
            clearMergePairFromUrl();
            setActivePair(null);
          }}
          onMerged={async () => {
            clearMergePairFromUrl();
            setActivePair(null);
            await Promise.all([
              utils.experiments.listSimilarPairsForMolecule.invalidate({
                moleculeId,
              }),
              utils.experiments.browseList.invalidate(),
              utils.experiments.browseSearch.invalidate(),
              utils.experiments.listMySimilarPairsSummary.invalidate(),
            ]);
          }}
        />
      ) : null}
    </section>
  );
}
