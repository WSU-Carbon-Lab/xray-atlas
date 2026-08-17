"use client";

import { useCallback, useMemo } from "react";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";
import type { PublicationCitation } from "~/lib/publication-citation";
import { SourcePaperPublicationsEditor } from "./source-paper-publications-editor";
import { LoadingSkeleton } from "~/components/feedback/loading-state";

type ExperimentSourcePublicationsEditorProps = {
  experimentId: string;
  enabled?: boolean;
};

function toPublicationCitation(row: {
  doi: string;
  title: string;
  journal: string | null;
  year: number | null;
  authors: string[];
}): PublicationCitation {
  return {
    doi: row.doi,
    title: row.title,
    journal: row.journal,
    year: row.year,
    authors: row.authors,
  };
}

/**
 * Ownership-gated source-publication list for a persisted experiment. Loads and
 * mutates via `listSourcePublications` / `addSourcePublication` /
 * `removeSourcePublication` while reusing the contribute list UI.
 */
export function ExperimentSourcePublicationsEditor({
  experimentId,
  enabled = true,
}: ExperimentSourcePublicationsEditorProps) {
  const utils = trpc.useUtils();
  const canEditQuery = trpc.experiments.canEditExperiment.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );
  const canEdit = canEditQuery.data?.canEdit === true;

  const listQuery = trpc.experiments.listSourcePublications.useQuery(
    { experimentId },
    { enabled: enabled && Boolean(experimentId) },
  );

  const addMutation = trpc.experiments.addSourcePublication.useMutation({
    onSuccess: async () => {
      await utils.experiments.listSourcePublications.invalidate({
        experimentId,
      });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      showToast("Source publication added", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const removeMutation = trpc.experiments.removeSourcePublication.useMutation({
    onSuccess: async () => {
      await utils.experiments.listSourcePublications.invalidate({
        experimentId,
      });
      await utils.experiments.browseList.invalidate();
      await utils.experiments.browseSearch.invalidate();
      showToast("Source publication removed", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const publications = useMemo(
    () =>
      (listQuery.data?.publications ?? []).map((row) =>
        toPublicationCitation(row),
      ),
    [listQuery.data?.publications],
  );

  const handleChange = useCallback(
    (next: PublicationCitation[]) => {
      if (!canEdit) {
        return;
      }
      const previousDois = new Set(publications.map((item) => item.doi));
      const nextDois = new Set(next.map((item) => item.doi));
      const added = next.find((item) => !previousDois.has(item.doi));
      const removed = publications.find((item) => !nextDois.has(item.doi));
      if (added) {
        addMutation.mutate({ experimentId, doi: added.doi });
        return;
      }
      if (removed) {
        removeMutation.mutate({ experimentId, doi: removed.doi });
      }
    },
    [addMutation, canEdit, experimentId, publications, removeMutation],
  );

  if (listQuery.isLoading || canEditQuery.isLoading) {
    return <LoadingSkeleton className="h-24 w-full rounded-lg" />;
  }

  if (listQuery.isError) {
    return (
      <p className="text-danger text-sm">
        Could not load source publications for this dataset.
      </p>
    );
  }

  return (
    <SourcePaperPublicationsEditor
      publications={publications}
      onChange={handleChange}
      disabled={
        !canEdit || addMutation.isPending || removeMutation.isPending
      }
    />
  );
}
