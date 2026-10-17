"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMoleculeDetail } from "~/components/browse/molecule-detail-context";
import {
  NexafsBrowseExperimentSection,
  type NexafsBrowseExperimentSectionProps,
} from "~/components/browse/nexafs-browse-experiment-section";
import { MoleculeSimilarDatasetsPanel } from "~/components/nexafs/molecule-similar-datasets-panel";
import { NexafsExperimentCompactSkeleton } from "~/components/feedback/loading-state";
import { canonicalMoleculeSlugFromView } from "~/lib/molecule-slug";
import {
  MERGE_PAIR_SEARCH_PARAM,
  parseMergePairSearchParam,
} from "~/lib/nexafs-experiment-deep-link";
import { trpc } from "~/trpc/client";

const VIEW_DEBOUNCE_KEY = "xray-atlas-view-debounce";
const VIEW_DEBOUNCE_MS = 2000;

type MoleculeNexafsInitialList =
  NexafsBrowseExperimentSectionProps["initialBrowseList"];

function shouldDebounceTrackView(): boolean {
  if (typeof window === "undefined") return true;
  const last = sessionStorage.getItem(VIEW_DEBOUNCE_KEY);
  if (!last) return false;
  const elapsed = Date.now() - parseInt(last, 10);
  return elapsed < VIEW_DEBOUNCE_MS;
}

function markTrackViewSent(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(VIEW_DEBOUNCE_KEY, Date.now().toString());
}

/**
 * Compact-card skeleton for the embedded NEXAFS list.
 *
 * Renders six `NexafsExperimentCompactSkeleton` rows. Used as the `Suspense`
 * fallback while the default dataset section streams, and by the hydration
 * gate when the URL skips the server seed.
 *
 * @returns A busy region labeled "Loading NEXAFS experiments".
 */
export function MoleculeNexafsBrowseFallback() {
  return (
    <div
      className="space-y-3"
      aria-busy
      aria-label="Loading NEXAFS experiments"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <NexafsExperimentCompactSkeleton key={i} />
      ))}
    </div>
  );
}

function useIsHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Holds the embedded NEXAFS list until hydration when no server seed exists.
 *
 * Filtered URLs and `nexafsExperiment` use this gate so the client query, not
 * the default cache page, fills the list. A provided `initialBrowseList`
 * renders immediately.
 *
 * @param props.initialBrowseList Optional cached default browse page.
 * @returns The skeleton, or `MoleculeNexafsBrowse` once a seed or hydration exists.
 */
export function MoleculeNexafsBrowseGate({
  initialBrowseList,
}: {
  initialBrowseList?: MoleculeNexafsInitialList;
}) {
  const hydrated = useIsHydrated();
  if (!initialBrowseList && !hydrated) {
    return <MoleculeNexafsBrowseFallback />;
  }
  return <MoleculeNexafsBrowse initialBrowseList={initialBrowseList} />;
}

/**
 * Embedded NEXAFS browse list locked to the molecule in context.
 *
 * Passes `initialBrowseList` through as the section's React Query seed.
 * Omitted seeds leave the section on its client query.
 *
 * @param props.initialBrowseList Cached default `experiments.browseList` page.
 * @returns `NexafsBrowseExperimentSection` in embedded mode.
 */
export function MoleculeNexafsBrowse({
  initialBrowseList,
}: {
  initialBrowseList?: MoleculeNexafsInitialList;
}) {
  const pathname = usePathname();
  const { moleculeId } = useMoleculeDetail();
  const contributeHref = `/contribute/nexafs?moleculeId=${moleculeId}`;

  return (
    <NexafsBrowseExperimentSection
      variant="embedded"
      basePath={pathname}
      contributeNexafsHref={contributeHref}
      showMoleculeFilter={false}
      lockedMoleculeId={moleculeId}
      emptyStateBrowseAllHref={`/browse/nexafs?molecule=${encodeURIComponent(moleculeId)}`}
      emptyListMessage="No NEXAFS datasets for this molecule yet."
      itemsPerPageLabelId="molecule-nexafs-items-per-page"
      initialBrowseList={initialBrowseList}
    />
  );
}

/**
 * Client molecule detail body: view tracking and the similar-dataset merge host.
 *
 * Renders `children` under the NEXAFS heading. The page passes either the
 * suspended default dataset section or `MoleculeNexafsBrowseGate` for filtered
 * URLs and `nexafsExperiment`. View tracking still waits for an authenticated
 * session and the session debounce. `mergePair` is read here and does not
 * affect the dataset seed.
 *
 * @param props.children Dataset list slot. Not awaited by this component.
 */
export function MoleculeDetailPageClient({
  children,
}: {
  children: ReactNode;
}) {
  const { molecule } = useMoleculeDetail();
  const { data: session, status: sessionStatus } = useSession();
  const trackViewSent = useRef(false);

  const trackView = trpc.molecules.trackView.useMutation();
  const trackViewMutateRef = useRef(trackView.mutate);
  useEffect(() => {
    trackViewMutateRef.current = trackView.mutate;
  }, [trackView.mutate]);

  useEffect(() => {
    if (!molecule?.id || trackViewSent.current) return;
    if (sessionStatus !== "authenticated" || !session?.user?.id) return;
    if (shouldDebounceTrackView()) return;
    trackViewSent.current = true;
    trackViewMutateRef.current(
      { moleculeId: molecule.id },
      {
        onSuccess: (data) => {
          if (data?.recorded === true) markTrackViewSent();
        },
        onError: () => {
          trackViewSent.current = false;
        },
      },
    );
  }, [molecule?.id, session?.user?.id, sessionStatus]);

  return (
    <section
      className="space-y-6"
      aria-labelledby="nexafs-heading"
      suppressHydrationWarning
    >
      <h2 id="nexafs-heading" className="sr-only" suppressHydrationWarning>
        NEXAFS spectra for this molecule
      </h2>
      <MoleculeSimilarDatasetsHost />
      {children}
    </section>
  );
}

function MoleculeSimilarDatasetsHost() {
  const { molecule, moleculeId } = useMoleculeDetail();
  const searchParams = useSearchParams();
  const initialMergePair = parseMergePairSearchParam(
    searchParams.get(MERGE_PAIR_SEARCH_PARAM),
  );
  const slug = canonicalMoleculeSlugFromView(molecule);
  return (
    <MoleculeSimilarDatasetsPanel
      moleculeId={moleculeId}
      moleculeSlug={slug}
      initialMergePair={initialMergePair}
    />
  );
}
