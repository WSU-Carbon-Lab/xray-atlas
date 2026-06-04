"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  ErrorMessage,
  Input,
  Label,
  ScrollShadow,
  Spinner,
  TextField,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import { ExternalLink, Link2, Unlink } from "lucide-react";
import type { DashboardLinkableExperimentDto } from "~/server/api/routers/dashboardSessions";
import { trpc } from "~/trpc/client";
import { showToast } from "~/components/ui/toast";

type ExperimentLinkCardProps = {
  sessionId: string;
  linkedExperiment: {
    id: string;
    canonicalSlug: string | null;
    instrumentName: string | null;
    moleculeLabel: string | null;
    browseHref: string;
    contributeHref: string;
  } | null;
  onLinked: () => void;
};

function experimentLabel(row: DashboardLinkableExperimentDto): string {
  const parts = [
    row.moleculeLabel,
    row.instrumentName,
    row.canonicalSlug,
  ].filter(Boolean);
  return parts.join(" · ") || row.id;
}

/**
 * Links a dashboard processing session to an editable Atlas NEXAFS experiment.
 */
export function ExperimentLinkCard({
  sessionId,
  linkedExperiment,
  onLinked,
}: ExperimentLinkCardProps) {
  const [query, setQuery] = useState("");
  const utils = trpc.useUtils();

  const searchQuery = trpc.dashboardSessions.searchLinkableExperiments.useQuery(
    { query, limit: 8 },
    { staleTime: 15_000 },
  );

  const linkMutation = trpc.dashboardSessions.linkExperiment.useMutation({
    onSuccess: () => {
      void utils.dashboardSessions.getById.invalidate({ sessionId });
      void utils.dashboardSessions.list.invalidate();
      onLinked();
      showToast("Experiment linked", "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const unlinkMutation = trpc.dashboardSessions.unlinkExperiment.useMutation({
    onSuccess: () => {
      void utils.dashboardSessions.getById.invalidate({ sessionId });
      void utils.dashboardSessions.list.invalidate();
      onLinked();
      showToast("Experiment unlinked", "success");
    },
    onError: (error) => showToast(error.message, "error"),
  });

  const results = useMemo(
    () => searchQuery.data ?? [],
    [searchQuery.data],
  );

  if (linkedExperiment) {
    return (
      <section className="border-border bg-surface rounded-lg border px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-foreground text-sm font-medium">Linked experiment</p>
            <p className="text-muted mt-1 text-sm">
              {linkedExperiment.moleculeLabel ?? "Dataset"} ·{" "}
              {linkedExperiment.instrumentName ?? "Instrument"}
            </p>
            {linkedExperiment.canonicalSlug ? (
              <p className="text-muted font-mono text-xs">
                {linkedExperiment.canonicalSlug}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={linkedExperiment.browseHref}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Browse
            </Link>
            <Link
              href={linkedExperiment.contributeHref}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Contribute
            </Link>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={unlinkMutation.isPending}
              onPress={() => unlinkMutation.mutate({ sessionId })}
            >
              <Unlink className="h-3.5 w-3.5" aria-hidden />
              Unlink
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-border bg-surface rounded-lg border px-5 py-4">
      <div className="flex items-start gap-3">
        <Link2 className="text-accent mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-medium">Link Atlas experiment</p>
          <p className="text-muted mt-1 text-sm">
            Search datasets you can edit, then link this session to upload raw STXM
            files to experiment-aux storage.
          </p>
          <TextField className="mt-3 max-w-md">
            <Label className="sr-only">Search experiments</Label>
            <Input
              placeholder="Molecule, slug, or instrument"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </TextField>
          {searchQuery.isLoading ? (
            <div className="mt-3 flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-muted mt-3 text-sm">
              No editable experiments found. Create a dataset on{" "}
              <Link href="/contribute/nexafs" className="text-accent hover:underline">
                Contribute NEXAFS
              </Link>{" "}
              first, then return here to link it.
            </p>
          ) : (
            <ScrollShadow className="mt-3 max-h-48">
              <ul className="flex flex-col gap-1">
                {results.map((row) => (
                  <li key={row.id}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start px-2 py-2 text-left"
                      isDisabled={linkMutation.isPending}
                      onPress={() =>
                        linkMutation.mutate({
                          sessionId,
                          experimentId: row.id,
                        })
                      }
                    >
                      <span className="text-foreground block text-sm">
                        {experimentLabel(row)}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollShadow>
          )}
          {linkMutation.error ? (
            <ErrorMessage className="mt-2">
              {linkMutation.error.message}
            </ErrorMessage>
          ) : null}
        </div>
      </div>
    </section>
  );
}
