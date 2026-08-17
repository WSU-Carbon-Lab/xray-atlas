"use client";

/**
 * Administrator catalog takedown: search and permanently remove any molecule
 * or NEXAFS dataset. Requires admin console access plus molecule_delete /
 * data_delete on an assigned role.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { Button, Card, SearchField, Tabs } from "@heroui/react";
import { AdminConsoleNav } from "~/components/admin/admin-console-nav";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";
import { trpc } from "~/trpc/client";
import type { AdminCatalogDeleteImpact } from "~/lib/nexafs/admin-catalog-types";
import { useDestructiveSessionStepUp } from "~/hooks/useDestructiveSessionStepUp";

const PAGE_SIZE = 20;

type CatalogTab = "molecules" | "datasets";

/**
 * Renders the admin catalog search and delete console.
 */
export default function AdminCatalogPage() {
  const [tab, setTab] = useState<CatalogTab>("datasets");
  const [moleculeDraft, setMoleculeDraft] = useState("");
  const [datasetDraft, setDatasetDraft] = useState("");
  const [moleculeQuery, setMoleculeQuery] = useState("");
  const [datasetQuery, setDatasetQuery] = useState("");
  const [moleculeOffset, setMoleculeOffset] = useState(0);
  const [datasetOffset, setDatasetOffset] = useState(0);
  const [pendingMoleculeId, setPendingMoleculeId] = useState<string | null>(
    null,
  );
  const [pendingExperimentId, setPendingExperimentId] = useState<string | null>(
    null,
  );
  const { runWithStepUp, isSteppingUp } = useDestructiveSessionStepUp();

  const capabilities = trpc.admin.catalog.capabilities.useQuery();
  const canDeleteMolecules = capabilities.data?.canDeleteMolecules === true;
  const canDeleteDatasets = capabilities.data?.canDeleteDatasets === true;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDatasetQuery(datasetDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [datasetDraft]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMoleculeQuery(moleculeDraft.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [moleculeDraft]);

  useEffect(() => {
    setDatasetOffset(0);
  }, [datasetQuery]);

  useEffect(() => {
    setMoleculeOffset(0);
  }, [moleculeQuery]);

  const moleculesQuery = trpc.admin.catalog.listMolecules.useQuery(
    {
      query: moleculeQuery,
      limit: PAGE_SIZE,
      offset: moleculeOffset,
    },
    { enabled: canDeleteMolecules && tab === "molecules", staleTime: 15_000 },
  );
  const datasetsQuery = trpc.admin.catalog.listDatasets.useQuery(
    {
      query: datasetQuery,
      limit: PAGE_SIZE,
      offset: datasetOffset,
    },
    { enabled: canDeleteDatasets && tab === "datasets", staleTime: 15_000 },
  );

  const moleculePreview = trpc.admin.catalog.previewMoleculeDelete.useQuery(
    { moleculeId: pendingMoleculeId ?? "" },
    { enabled: Boolean(pendingMoleculeId) },
  );
  const experimentPreview = trpc.admin.catalog.previewExperimentDelete.useQuery(
    { experimentId: pendingExperimentId ?? "" },
    { enabled: Boolean(pendingExperimentId) },
  );

  const utils = trpc.useUtils();
  const deleteMolecule = trpc.admin.catalog.deleteMolecule.useMutation({
    onSuccess: async (result) => {
      showToast(`Removed molecule ${result.impact.label}`, "success");
      setPendingMoleculeId(null);
      await Promise.all([
        utils.admin.catalog.listMolecules.invalidate(),
        utils.admin.catalog.listDatasets.invalidate(),
        utils.experiments.browseList.invalidate(),
        utils.experiments.browseSearch.invalidate(),
        utils.molecules.invalidate(),
      ]);
    },
  });
  const deleteExperiment = trpc.admin.catalog.deleteExperiment.useMutation({
    onSuccess: async (result) => {
      showToast(`Removed dataset ${result.impact.label}`, "success");
      setPendingExperimentId(null);
      await Promise.all([
        utils.admin.catalog.listDatasets.invalidate(),
        utils.experiments.browseList.invalidate(),
        utils.experiments.browseSearch.invalidate(),
      ]);
    },
  });

  const handleConfirmMoleculeDelete = useCallback(async () => {
    if (!pendingMoleculeId) {
      return;
    }
    await runWithStepUp(async () => {
      await deleteMolecule.mutateAsync({ moleculeId: pendingMoleculeId });
    });
  }, [deleteMolecule, pendingMoleculeId, runWithStepUp]);

  const handleConfirmExperimentDelete = useCallback(async () => {
    if (!pendingExperimentId) {
      return;
    }
    await runWithStepUp(async () => {
      await deleteExperiment.mutateAsync({ experimentId: pendingExperimentId });
    });
  }, [deleteExperiment, pendingExperimentId, runWithStepUp]);

  const onTabChange = useCallback((key: string | number) => {
    const next = String(key);
    if (next === "molecules" || next === "datasets") {
      queueMicrotask(() => setTab(next));
    }
  }, []);

  const flushDatasetSearch = useCallback(() => {
    setDatasetQuery(datasetDraft.trim());
  }, [datasetDraft]);

  const flushMoleculeSearch = useCallback(() => {
    setMoleculeQuery(moleculeDraft.trim());
  }, [moleculeDraft]);

  const moleculePageCount = useMemo(() => {
    const total = moleculesQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [moleculesQuery.data?.total]);
  const datasetPageCount = useMemo(() => {
    const total = datasetsQuery.data?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  }, [datasetsQuery.data?.total]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12">
      <AdminConsoleNav active="catalog" />
      <header className="border-border bg-surface-1 mb-8 rounded-2xl border px-6 py-6 shadow-sm sm:px-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Catalog
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
          Permanently remove any molecule or NEXAFS dataset from Atlas. Molecule
          delete also removes linked samples, spectra, and auxiliary files.
          Zenodo records are not unpublished. This cannot be undone.
        </p>
      </header>

      <Card className="border-border bg-surface-1 overflow-hidden border shadow-sm">
        <Card.Content className="px-5 py-5">
          <Tabs
            selectedKey={tab}
            onSelectionChange={onTabChange}
            className="w-full"
          >
            <Tabs.ListContainer className="w-full">
              <Tabs.List
                aria-label="Catalog target"
                className="border-border bg-surface flex w-full flex-wrap gap-1 rounded-xl border p-1"
              >
                <Tabs.Tab id="datasets">
                  Datasets
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="molecules">
                  Molecules
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="datasets" className="pt-4">
              {capabilities.isLoading ? (
                <p className="text-muted text-sm">Checking permissions…</p>
              ) : capabilities.isError ? (
                <p className="text-danger text-sm">
                  {capabilities.error.message}
                </p>
              ) : canDeleteDatasets ? (
                <div className="flex flex-col gap-4">
                  <SearchField
                    value={datasetDraft}
                    onChange={setDatasetDraft}
                    variant="secondary"
                    aria-label="Search datasets"
                    className="max-w-md"
                  >
                    <SearchField.Group className="border-border bg-surface flex h-12 min-h-12 w-full flex-row items-center gap-2 rounded-lg border px-4">
                      <SearchField.SearchIcon className="text-muted h-4 w-4 shrink-0" />
                      <SearchField.Input
                        placeholder="Molecule, edge, UUID, or Atlas id"
                        className="placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none"
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            flushDatasetSearch();
                          }
                        }}
                      />
                      {datasetDraft ? (
                        <SearchField.ClearButton
                          aria-label="Clear dataset search"
                          className="text-muted h-6 w-6 shrink-0 rounded p-0.5"
                        />
                      ) : null}
                    </SearchField.Group>
                  </SearchField>
                  {datasetsQuery.isLoading ? (
                    <p className="text-muted text-sm">Loading datasets…</p>
                  ) : datasetsQuery.isError ? (
                    <p className="text-danger text-sm">
                      {datasetsQuery.error.message}
                    </p>
                  ) : (datasetsQuery.data?.datasets.length ?? 0) === 0 ? (
                    <p className="text-muted text-sm">No datasets found.</p>
                  ) : (
                    <ul className="divide-border divide-y">
                      {datasetsQuery.data?.datasets.map((row) => (
                        <li
                          key={row.experimentId}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-medium">
                              {row.moleculeName}
                              <span className="text-muted mx-2 font-normal">
                                {row.edgeLabel}
                              </span>
                              {row.experimentType ? (
                                <span className="text-muted font-normal">
                                  {row.experimentType}
                                </span>
                              ) : null}
                            </p>
                            <p className="text-muted text-xs">
                              {row.instrumentName}
                              {row.atlasDatasetId
                                ? ` · ${row.atlasDatasetId}`
                                : ""}
                              {` · ${row.polarizationCount} geometr${row.polarizationCount === 1 ? "y" : "ies"}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/molecules/${row.moleculeId}?nexafsExperiment=${row.experimentId}`}
                              className="text-accent text-sm underline"
                            >
                              Open
                            </Link>
                            <Button
                              size="sm"
                              variant="danger"
                              onPress={() =>
                                setPendingExperimentId(row.experimentId)
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <CatalogPager
                    page={Math.floor(datasetOffset / PAGE_SIZE) + 1}
                    pageCount={datasetPageCount}
                    onPageChange={(page) =>
                      setDatasetOffset((page - 1) * PAGE_SIZE)
                    }
                  />
                </div>
              ) : (
                <p className="text-muted text-sm">
                  Your roles do not include data_delete.
                </p>
              )}
            </Tabs.Panel>
            <Tabs.Panel id="molecules" className="pt-4">
              {capabilities.isLoading ? (
                <p className="text-muted text-sm">Checking permissions…</p>
              ) : capabilities.isError ? (
                <p className="text-danger text-sm">
                  {capabilities.error.message}
                </p>
              ) : canDeleteMolecules ? (
                <div className="flex flex-col gap-4">
                  <SearchField
                    value={moleculeDraft}
                    onChange={setMoleculeDraft}
                    variant="secondary"
                    aria-label="Search molecules"
                    className="max-w-md"
                  >
                    <SearchField.Group className="border-border bg-surface flex h-12 min-h-12 w-full flex-row items-center gap-2 rounded-lg border px-4">
                      <SearchField.SearchIcon className="text-muted h-4 w-4 shrink-0" />
                      <SearchField.Input
                        placeholder="Name, formula, slug, or UUID"
                        className="placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none"
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            flushMoleculeSearch();
                          }
                        }}
                      />
                      {moleculeDraft ? (
                        <SearchField.ClearButton
                          aria-label="Clear molecule search"
                          className="text-muted h-6 w-6 shrink-0 rounded p-0.5"
                        />
                      ) : null}
                    </SearchField.Group>
                  </SearchField>
                  {moleculesQuery.isLoading ? (
                    <p className="text-muted text-sm">Loading molecules…</p>
                  ) : moleculesQuery.isError ? (
                    <p className="text-danger text-sm">
                      {moleculesQuery.error.message}
                    </p>
                  ) : (moleculesQuery.data?.molecules.length ?? 0) === 0 ? (
                    <p className="text-muted text-sm">No molecules found.</p>
                  ) : (
                    <ul className="divide-border divide-y">
                      {moleculesQuery.data?.molecules.map((row) => (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground truncate text-sm font-medium">
                              {row.displayName}
                            </p>
                            <p className="text-muted text-xs">
                              {row.chemicalformula}
                              {` · ${row.experimentCount} dataset${row.experimentCount === 1 ? "" : "s"}`}
                              {` · ${row.sampleCount} sample${row.sampleCount === 1 ? "" : "s"}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/molecules/${row.slug ?? row.id}`}
                              className="text-accent text-sm underline"
                            >
                              Open
                            </Link>
                            <Button
                              size="sm"
                              variant="danger"
                              onPress={() => setPendingMoleculeId(row.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <CatalogPager
                    page={Math.floor(moleculeOffset / PAGE_SIZE) + 1}
                    pageCount={moleculePageCount}
                    onPageChange={(page) =>
                      setMoleculeOffset((page - 1) * PAGE_SIZE)
                    }
                  />
                </div>
              ) : (
                <p className="text-muted text-sm">
                  Your roles do not include molecule_delete.
                </p>
              )}
            </Tabs.Panel>
          </Tabs>
        </Card.Content>
      </Card>

      <SimpleDialog
        isOpen={Boolean(pendingExperimentId)}
        onClose={() => {
          if (isSteppingUp || deleteExperiment.isPending) {
            return;
          }
          setPendingExperimentId(null);
        }}
        title="Delete dataset"
      >
        <CatalogDeleteImpactBody
          loading={experimentPreview.isLoading}
          error={experimentPreview.error?.message ?? null}
          impact={experimentPreview.data ?? null}
          kind="dataset"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            isDisabled={isSteppingUp || deleteExperiment.isPending}
            onPress={() => setPendingExperimentId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            isPending={isSteppingUp || deleteExperiment.isPending}
            isDisabled={
              experimentPreview.isLoading || Boolean(experimentPreview.error)
            }
            onPress={() => void handleConfirmExperimentDelete()}
          >
            Delete dataset
          </Button>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={Boolean(pendingMoleculeId)}
        onClose={() => {
          if (isSteppingUp || deleteMolecule.isPending) {
            return;
          }
          setPendingMoleculeId(null);
        }}
        title="Delete molecule"
      >
        <CatalogDeleteImpactBody
          loading={moleculePreview.isLoading}
          error={moleculePreview.error?.message ?? null}
          impact={moleculePreview.data ?? null}
          kind="molecule"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            isDisabled={isSteppingUp || deleteMolecule.isPending}
            onPress={() => setPendingMoleculeId(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            isPending={isSteppingUp || deleteMolecule.isPending}
            isDisabled={
              moleculePreview.isLoading || Boolean(moleculePreview.error)
            }
            onPress={() => void handleConfirmMoleculeDelete()}
          >
            Delete molecule
          </Button>
        </div>
      </SimpleDialog>
    </div>
  );
}

function CatalogPager({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="secondary"
        isDisabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-muted text-xs">
        Page {page} of {pageCount}
      </span>
      <Button
        size="sm"
        variant="secondary"
        isDisabled={page >= pageCount}
        onPress={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}

function CatalogDeleteImpactBody({
  loading,
  error,
  impact,
  kind,
}: {
  loading: boolean;
  error: string | null;
  impact: AdminCatalogDeleteImpact | null;
  kind: "molecule" | "dataset";
}) {
  if (loading) {
    return <p className="text-muted text-sm">Calculating impact…</p>;
  }
  if (error) {
    return <p className="text-danger text-sm">{error}</p>;
  }
  if (!impact) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-sm font-medium">{impact.label}</p>
      <p className="text-muted text-sm">
        {kind === "molecule"
          ? `This removes the molecule, ${impact.sampleCount} sample${impact.sampleCount === 1 ? "" : "s"}, and ${impact.experimentCount} dataset${impact.experimentCount === 1 ? "" : "s"} (${impact.spectrumPointCount} spectrum points).`
          : `This removes 1 dataset (${impact.spectrumPointCount} spectrum points). The molecule record remains.`}
      </p>
      {impact.zenodoDepositCount > 0 ? (
        <p className="text-muted text-sm">
          {impact.zenodoDepositCount} Zenodo deposit row
          {impact.zenodoDepositCount === 1 ? "" : "s"} will be dropped from
          Atlas. Published Zenodo records are not unpublished.
        </p>
      ) : null}
      <p className="text-danger text-sm">This cannot be undone.</p>
      <p className="text-muted text-sm">
        Confirming asks for your passkey before the delete runs.
      </p>
    </div>
  );
}
