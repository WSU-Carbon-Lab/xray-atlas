"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMoleculeDetail } from "~/components/browse/molecule-detail-context";
import { NexafsBrowseExperimentSection } from "~/components/browse/nexafs-browse-experiment-section";
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

function MoleculeNexafsBrowse() {
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
    />
  );
}

function MoleculeNexafsBrowseFallback() {
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

function MoleculeNexafsBrowseAfterMount() {
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return <MoleculeNexafsBrowseFallback />;
  }
  return (
    <>
      <MoleculeSimilarDatasetsHost />
      <MoleculeNexafsBrowse />
    </>
  );
}

export default function MoleculeDetailPage() {
  const { molecule } = useMoleculeDetail();
  const { data: session, status: sessionStatus } = useSession();
  const trackViewSent = useRef(false);

  const trackView = trpc.molecules.trackView.useMutation();
  const trackViewMutateRef = useRef(trackView.mutate);
  trackViewMutateRef.current = trackView.mutate;

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
      <MoleculeNexafsBrowseAfterMount />
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
