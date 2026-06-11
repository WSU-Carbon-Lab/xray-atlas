"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  ContributionFileDropOverlay,
  type ContributionFileDropOverlayFileKind,
} from "~/components/contribute";
import type { MoleculeUploadData } from "~/types/upload";
import { normalizeMoleculeUploadForPersistence } from "~/types/upload";
import { MoleculeSynonymsField } from "./molecule-synonyms-field";
import { MoleculeTagsField } from "./molecule-tags-field";
import { trpc } from "~/trpc/client";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import { FieldTooltip } from "~/components/ui/field-tooltip";
import {
  MOLECULE_COMPOUND_KINDS,
  formatMoleculeFormulaForKind,
  moleculeCompoundKindLabel,
  parseRepeatUnitFormula,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import {
  Button,
  Card,
  Chip,
  Description,
  Form,
  InputGroup,
  Label,
  ListBox,
  Select,
  Separator,
  Spinner,
  Switch,
  TextField,
} from "@heroui/react";
import { parseMoleculeJsonFile } from "~/app/contribute/molecule/utils/parseMoleculeJson";
import { parseMoleculeCsvFile } from "~/app/contribute/molecule/utils/parseMoleculeCsv";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/server/api/root";
import type { MoleculeContributionFormProps } from "./types";
import {
  MoleculeIdentifierSearch,
  MoleculeIdentifierSearchFeedback,
  type MoleculeIdentifierSearchHandle,
} from "./molecule-identifier-search";
import { MoleculeResolvedIdentityCard } from "./molecule-resolved-identity-card";
import { MoleculeStructureSection } from "./molecule-structure-section";
import type { BookendMarksState } from "~/features/molecule-sketcher";
import type { StructureLookupContext } from "./molecule-contribute-sketcher-panel";
import type { StructureLookupOptions } from "~/features/molecule-registry-workflow";
import {
  MoleculeLookupConfirmation,
  MoleculePreferredIdentity,
  useMoleculeRegistryWorkflow,
} from "~/features/molecule-registry-workflow";
import { validatePolymerStructureRequirement } from "~/lib/molecule-polymer-structure-validation";

type CreateMoleculeResponse = inferRouterOutputs<AppRouter>["molecules"]["create"];

/**
 * Registry contribute form for linking molecules into X-ray Atlas (metadata,
 * identifiers, optional SVG depiction)—not NEXAFS dataset upload.
 */
export function MoleculeContributionForm({
  variant = "page",
  onCompleted,
  onClose,
  className = "",
}: MoleculeContributionFormProps = {}) {
  const { data: session } = useSession();
  const isSignedIn = !!session?.user;
  const isModal = variant === "modal";
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);

  const workflow = useMoleculeRegistryWorkflow();
  const {
    formData,
    setFormData,
    pendingTags,
    setPendingTags,
    importedSynonyms,
    editingMoleculeId,
    resolvedIdentity,
    pendingLookup,
    identityFsm,
    dispatchIdentity,
    polymerKindSuggested,
    chemistryWarnings,
    searchFeedback,
    setSearchFeedback,
    clearTransientSearch,
    queuePendingLookup,
    applyPendingLookup,
    dismissPendingLookup,
    markIdentityDirty,
    promoteSynonym,
    handleCompoundKindChange,
    resetWorkflow,
  } = workflow;

  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [sketchBookends, setSketchBookends] = useState<BookendMarksState>({
    open: null,
    close: null,
  });
  const [structureValidationError, setStructureValidationError] = useState<
    string | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [structureLookupBusy, setStructureLookupBusy] = useState(false);

  const identifierSearchRef = useRef<MoleculeIdentifierSearchHandle>(null);
  const structureLookupRef = useRef<
    StructureLookupContext & StructureLookupOptions
  >({
    registrySmiles: "",
    lookupSmiles: "",
    components: [],
  });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] =
    useState<ContributionFileDropOverlayFileKind | null>(null);
  const [draggedFileName, setDraggedFileName] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  const utils = trpc.useUtils();
  const createMolecule = trpc.molecules.create.useMutation();
  const updateMolecule = trpc.molecules.update.useMutation();
  const setTags = trpc.molecules.setTags.useMutation();
  const findOrCreateTag = trpc.molecules.findOrCreateTag.useMutation();
  const uploadImage = trpc.molecules.uploadImage.useMutation();
  const { data: allTags = [], isLoading: isTagsLoading } =
    trpc.molecules.listTags.useQuery(undefined, { staleTime: 5 * 60 * 1000 });

  const isDark = themeMounted && resolvedTheme === "dark";

  const handleRegistryStubChange = useCallback(
    (selected: boolean) => {
      setFormData((prev) => ({ ...prev, registryStub: selected }));
      if (selected) {
        setSvgDataUrl(null);
        setImagePreview("");
      }
      setStructureValidationError(null);
    },
    [setFormData],
  );

  const handleSketchBookendsChange = useCallback((bookends: BookendMarksState) => {
    setSketchBookends(bookends);
    setStructureValidationError(null);
  }, []);

  const handleSvgDataUrlReady = useCallback((dataUrl: string | null) => {
    setSvgDataUrl(dataUrl);
    setStructureValidationError(null);
  }, []);

  const handleImagePreviewChange = useCallback((preview: string) => {
    setImagePreview(preview);
    if (preview.trim().length === 0) {
      setStructureValidationError(null);
    }
  }, []);

  const handleStructureSmilesChange = useCallback(
    (smiles: string) => {
      setFormData((prev) =>
        prev.smiles === smiles ? prev : { ...prev, smiles },
      );
    },
    [setFormData],
  );

  const handleStructureLookupContextChange = useCallback(
    (context: StructureLookupContext) => {
      structureLookupRef.current = {
        registrySmiles: context.registrySmiles,
        lookupSmiles: context.lookupSmiles,
        components: context.components,
      };
    },
    [],
  );

  const handleLookupIdentifiersFromStructure = useCallback(() => {
    const registrySmiles = formData.smiles.trim();
    const ctx = structureLookupRef.current;
    const lookupSmiles =
      ctx.lookupSmiles.trim().length > 0 ? ctx.lookupSmiles : registrySmiles;
    if (lookupSmiles.length === 0) {
      return;
    }
    void identifierSearchRef.current?.lookupFromSmiles(lookupSmiles, {
      registrySmiles,
      components:
        ctx.components.length > 0 ? ctx.components : undefined,
    });
  }, [formData.smiles]);

  const handleJsonDropped = useCallback(
    async (file: File) => {
      try {
        const parsed = await parseMoleculeJsonFile(file);
        clearTransientSearch();
        setFormData((prev) => ({
          ...prev,
          commonName: parsed.commonName || prev.commonName,
          iupacName: parsed.iupacName || prev.iupacName,
          synonyms: parsed.synonyms.length > 0 ? parsed.synonyms : prev.synonyms,
          smiles: parsed.smiles || prev.smiles,
          inchi: parsed.inchi || prev.inchi,
          chemicalFormula: parsed.chemicalFormula || prev.chemicalFormula,
          casNumber: parsed.casNumber ?? prev.casNumber,
          pubchemCid: parsed.pubchemCid ?? prev.pubchemCid,
          tagIds: parsed.tagIds.length > 0 ? parsed.tagIds : (prev.tagIds ?? []),
        }));
        setPendingTags([]);
      } catch (err) {
        setSearchFeedback({
          searchError:
            err instanceof Error ? err.message : "Failed to parse JSON file",
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: null,
        });
      }
    },
    [clearTransientSearch, setFormData, setPendingTags, setSearchFeedback],
  );

  const handleCsvDropped = useCallback(
    async (file: File) => {
      try {
        const parsed = await parseMoleculeCsvFile(file);
        clearTransientSearch();
        setFormData((prev) => ({
          ...prev,
          commonName: parsed.commonName || prev.commonName,
          iupacName: parsed.iupacName || prev.iupacName,
          synonyms: parsed.synonyms.length > 0 ? parsed.synonyms : prev.synonyms,
          smiles: parsed.smiles || prev.smiles,
          inchi: parsed.inchi || prev.inchi,
          chemicalFormula: parsed.chemicalFormula || prev.chemicalFormula,
          casNumber: parsed.casNumber ?? prev.casNumber,
          pubchemCid: parsed.pubchemCid ?? prev.pubchemCid,
          tagIds: parsed.tagIds.length > 0 ? parsed.tagIds : (prev.tagIds ?? []),
        }));
        setPendingTags([]);
      } catch (err) {
        setSearchFeedback({
          searchError:
            err instanceof Error ? err.message : "Failed to parse CSV file",
          searchSuccess: null,
          searchWarnings: [],
          pubChemUrl: null,
          resolvedIdentity: null,
        });
      }
    },
    [clearTransientSearch, setFormData, setPendingTags, setSearchFeedback],
  );

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        const items = Array.from(e.dataTransfer?.items ?? []);
        const fileTypes = items
          .filter((item) => item.kind === "file")
          .map((item) => {
            const f = item.getAsFile();
            const name = f?.name.toLowerCase() ?? "";
            if (name.endsWith(".json")) return "json" as const;
            if (name.endsWith(".csv")) return "csv" as const;
            return null;
          })
          .filter((t): t is "csv" | "json" => t !== null);
        if (fileTypes.length > 0) {
          setIsDragging(true);
          const unique = Array.from(new Set(fileTypes));
          setDraggedFileType(unique.length === 1 ? unique[0]! : "mixed");
          const first = items.find((item) => item.kind === "file")?.getAsFile();
          if (first?.name) setDraggedFileName(first.name);
        }
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
        setDraggedFileType(null);
        setDraggedFileName(null);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      setDraggedFileType(null);
      setDraggedFileName(null);
      const files = Array.from(e.dataTransfer?.files ?? []).filter(
        (file) =>
          file.name.toLowerCase().endsWith(".json") ||
          file.name.toLowerCase().endsWith(".csv"),
      );
      const first = files[0];
      if (!first) return;
      if (first.name.toLowerCase().endsWith(".json")) {
        void handleJsonDropped(first);
      } else {
        void handleCsvDropped(first);
      }
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [handleJsonDropped, handleCsvDropped]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      setSubmitStatus({
        type: "error",
        message: "Please sign in to add molecules to the registry.",
      });
      return;
    }

    const polymerStructureCheck = validatePolymerStructureRequirement(formData, {
      svgDataUrl,
      sketchState: { bookends: sketchBookends },
    });
    if (!polymerStructureCheck.ok) {
      setStructureValidationError(polymerStructureCheck.message);
      setSubmitStatus({
        type: "error",
        message: polymerStructureCheck.message,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });
    setStructureValidationError(null);

    try {
      const payload = normalizeMoleculeUploadForPersistence(formData);
      let moleculeId: string | null = null;
      let actionVerb: "updated" | "uploaded" = "uploaded";
      let moleculeName = payload.iupacName;

      const pendingIds: string[] = [];
      for (const p of pendingTags) {
        const t = await findOrCreateTag.mutateAsync({
          name: p.name,
          color: p.color,
        });
        pendingIds.push(t.id);
      }
      if (pendingIds.length > 0) {
        void utils.molecules.listTags.invalidate();
      }
      const mergedTagIds = [
        ...new Set([...(payload.tagIds ?? []), ...pendingIds]),
      ];

      if (editingMoleculeId) {
        await updateMolecule.mutateAsync({
          moleculeId: editingMoleculeId,
          iupacName: payload.iupacName,
          commonNames: [
            payload.commonName.trim(),
            ...payload.synonyms.filter((s) => s.trim().length > 0),
          ],
          chemicalFormula: payload.chemicalFormula,
          SMILES: payload.smiles,
          InChI: payload.inchi,
          casNumber: payload.casNumber,
          pubChemCid: payload.pubchemCid,
        });
        await setTags.mutateAsync({
          moleculeId: editingMoleculeId,
          tagIds: mergedTagIds,
        });
        moleculeId = editingMoleculeId;
        actionVerb = "updated";
      } else {
        const createResult: CreateMoleculeResponse =
          await createMolecule.mutateAsync({
            ...payload,
            tagIds: mergedTagIds,
          });
        moleculeId = createResult.molecule?.id ?? null;
        moleculeName = createResult.molecule?.iupacName ?? moleculeName;
        actionVerb = createResult.updated ? "updated" : "uploaded";
      }

      if (svgDataUrl && moleculeId && !payload.registryStub) {
        try {
          await uploadImage.mutateAsync({
            moleculeId,
            imageData: svgDataUrl,
          });
        } catch (imageError: unknown) {
          const imageMessage =
            imageError instanceof Error ? imageError.message : "Unknown error";
          setSubmitStatus({
            type: "success",
            message: `Registry entry "${moleculeName}" ${actionVerb}, but SVG upload failed: ${imageMessage}`,
          });
          return;
        }
      }

      setSubmitStatus({
        type: "success",
        message: payload.registryStub
          ? `Registry stub "${moleculeName}" ${actionVerb}. Add a structure SVG when ready.`
          : `Registry entry "${moleculeName}" ${actionVerb} successfully.`,
      });

      onCompleted?.({ moleculeId: moleculeId ?? undefined });
      if (isModal) {
        onClose?.();
      }

      resetWorkflow();
      setSvgDataUrl(null);
      setImagePreview("");
      setSketchBookends({ open: null, close: null });
      setStructureValidationError(null);
    } catch (error: unknown) {
      const extractedMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? (error as { data?: { message?: string } }).data?.message
            : null;
      setSubmitStatus({
        type: "error",
        message:
          extractedMessage ??
          "Failed to save registry entry. Check the console for details.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const compoundKind = formData.compoundKind ?? "small_molecule";
  const formulaDisplayValue = parseRepeatUnitFormula(formData.chemicalFormula);
  const formulaHelper =
    compoundKind === "polymer" || compoundKind === "macromolecule"
      ? `Stored as ${formatMoleculeFormulaForKind(formulaDisplayValue, compoundKind) || "(…)n"}`
      : null;
  const hasStructure = formData.smiles.trim().length > 0;
  const showIdentityCard = resolvedIdentity !== null;
  const showManualCompoundControls = !showIdentityCard && !pendingLookup;
  const showStructureRegistryStub =
    !showIdentityCard || hasStructure;

  return (
    <>
      <ContributionFileDropOverlay
        isDragging={isDragging}
        fileKind={draggedFileType ?? "mixed"}
        fileName={draggedFileName}
      />
      <Form
        onSubmit={handleSubmit}
        className={className ? `space-y-6 ${className}` : "space-y-6"}
      >
        <Card className="border-border bg-surface-1 border shadow-sm">
          <Card.Content className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-foreground text-lg font-semibold">
                Registry identity
              </h2>
              {editingMoleculeId ? (
                <Chip size="sm" variant="soft" color="accent">
                  Editing existing entry
                </Chip>
              ) : null}
            </div>

            <Description className="text-muted text-sm">
              Search by name, draw a structure, or enter PubChem CID / CAS to
              open an existing entry or prefill a new one.
            </Description>

            <MoleculeIdentifierSearch
              ref={identifierSearchRef}
              formData={formData}
              structureSmiles={formData.smiles}
              onStructureLookupBusyChange={setStructureLookupBusy}
              onFormDataChange={(updater) => {
                setFormData(updater);
                markIdentityDirty();
              }}
              editingMoleculeId={editingMoleculeId}
              onEditingMoleculeIdChange={() => undefined}
              identityFsm={identityFsm}
              dispatchIdentity={dispatchIdentity}
              onPendingLookup={queuePendingLookup}
              onSearchComplete={setSearchFeedback}
              onClearSearchFeedback={clearTransientSearch}
            />

            {pendingLookup ? (
              <MoleculeLookupConfirmation
                pending={pendingLookup}
                isDark={isDark}
                onConfirm={applyPendingLookup}
                onDismiss={dismissPendingLookup}
                onSelectCandidate={(candidate) => {
                  void identifierSearchRef.current?.selectPubChemCandidate(
                    candidate,
                  );
                }}
                busy={structureLookupBusy}
              />
            ) : null}

            <MoleculeIdentifierSearchFeedback
              searchError={searchFeedback.searchError}
              searchSuccess={searchFeedback.searchSuccess}
              searchWarnings={searchFeedback.searchWarnings}
              pubChemUrl={searchFeedback.pubChemUrl}
              resolvedIdentity={resolvedIdentity}
            />

            {showIdentityCard ? (
              <MoleculeResolvedIdentityCard
                identity={resolvedIdentity}
                warnings={chemistryWarnings}
                compoundKind={compoundKind}
                onCompoundKindChange={handleCompoundKindChange}
                chemicalFormula={formData.chemicalFormula}
                registryStub={formData.registryStub ?? false}
                onRegistryStubChange={handleRegistryStubChange}
                hasStructure={hasStructure}
                polymerKindSuggested={polymerKindSuggested}
                previewSnapshot={identityFsm.previewSnapshot}
                isDark={isDark}
              />
            ) : null}

            {showManualCompoundControls ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  selectedKey={compoundKind}
                  onSelectionChange={(key) => {
                    if (typeof key !== "string") return;
                    handleCompoundKindChange(key as MoleculeCompoundKind);
                  }}
                  aria-label="Compound kind"
                >
                  <Label className="text-foreground mb-1.5 text-sm font-medium">
                    Compound kind
                  </Label>
                  <Select.Trigger className="border-border bg-surface focus-visible:ring-accent min-h-11 w-full rounded-lg border focus:outline-none focus-visible:ring-2">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox aria-label="Compound kind">
                      {MOLECULE_COMPOUND_KINDS.map((kind) => (
                        <ListBox.Item
                          key={kind}
                          textValue={moleculeCompoundKindLabel(kind)}
                        >
                          {moleculeCompoundKindLabel(kind)}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div className="flex items-end pb-1">
                  <Switch
                    isSelected={formData.registryStub ?? false}
                    onChange={handleRegistryStubChange}
                    size="sm"
                  >
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Content>
                      <Label className="text-foreground text-sm">
                        Registry stub (no structure yet)
                      </Label>
                    </Switch.Content>
                  </Switch>
                </div>
              </div>
            ) : null}

            <MoleculePreferredIdentity
              preferredName={formData.commonName}
              iupacName={formData.iupacName}
              onPreferredNameChange={(value) =>
                setFormData((prev) => ({ ...prev, commonName: value }))
              }
              onIupacNameChange={(value) =>
                setFormData((prev) => ({ ...prev, iupacName: value }))
              }
              synonyms={formData.synonyms}
              onPromoteSynonym={promoteSynonym}
              linkedIdentity={resolvedIdentity}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <MoleculeSynonymsField
                synonyms={formData.synonyms}
                onSynonymsChange={(synonyms) =>
                  setFormData((prev) => ({ ...prev, synonyms }))
                }
                importedSynonyms={importedSynonyms}
              />
              <MoleculeTagsField
                allTags={allTags}
                tagIds={formData.tagIds ?? []}
                onTagIdsChange={(tagIds) =>
                  setFormData((prev) => ({ ...prev, tagIds }))
                }
                pendingTags={pendingTags}
                onPendingTagsChange={setPendingTags}
                isLoading={isTagsLoading}
              />
            </div>

            <TextField
              name="smiles"
              value={formData.smiles}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, smiles: value }))
              }
              isRequired={!formData.registryStub}
              isDisabled={formData.registryStub}
              variant="secondary"
              fullWidth
            >
              <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                SMILES
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input
                  className="font-mono text-sm"
                  placeholder={
                    formData.registryStub
                      ? "Optional until structure is added"
                      : "Canonical SMILES"
                  }
                  autoComplete="off"
                />
              </InputGroup>
            </TextField>

            <TextField
              name="inchi"
              value={formData.inchi}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, inchi: value }))
              }
              isRequired={!formData.registryStub}
              isDisabled={formData.registryStub}
              variant="secondary"
              fullWidth
            >
              <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                InChI
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input
                  className="font-mono text-sm"
                  placeholder="InChI=1S/…"
                  autoComplete="off"
                />
              </InputGroup>
            </TextField>

            <TextField
              name="chemicalFormula"
              value={formulaDisplayValue}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  chemicalFormula: formatMoleculeFormulaForKind(
                    value,
                    prev.compoundKind ?? "small_molecule",
                  ),
                }))
              }
              isRequired
              variant="secondary"
              fullWidth
            >
              <Label className="text-foreground mb-1.5 flex items-center gap-1 text-sm font-medium">
                Chemical formula
                <FieldTooltip description="Hill-order formula. Polymers use repeat-unit notation such as (C8H8)n." />
              </Label>
              <InputGroup variant="secondary" fullWidth>
                <InputGroup.Input
                  placeholder={
                    compoundKind === "polymer" ? "C8H8 repeat unit" : "C82H86F4N8O2S5"
                  }
                  autoComplete="off"
                />
              </InputGroup>
              {formulaHelper ? (
                <Description className="text-muted mt-1 text-xs">
                  {formulaHelper}
                </Description>
              ) : null}
            </TextField>
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface-1 border shadow-sm">
          <Card.Content className="space-y-4 p-5 sm:p-6">
            <MoleculeStructureSection
              smiles={formData.smiles}
              onSmilesChange={handleStructureSmilesChange}
              imagePreview={imagePreview}
              onImagePreviewChange={handleImagePreviewChange}
              onSvgDataUrlReady={handleSvgDataUrlReady}
              registryStub={formData.registryStub ?? false}
              onRegistryStubChange={handleRegistryStubChange}
              showRegistryStubToggle={showStructureRegistryStub}
              structureDisabled={formData.registryStub ?? false}
              structureValidationError={structureValidationError}
              onSketchBookendsChange={handleSketchBookendsChange}
              onLookupIdentifiers={handleLookupIdentifiersFromStructure}
              onStructureLookupContextChange={handleStructureLookupContextChange}
              lookupIdentifiersBusy={structureLookupBusy}
            />
          </Card.Content>
        </Card>

        <Separator className="bg-border" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted text-xs sm:max-w-md">
            {editingMoleculeId
              ? "Save updates the registry record. Optional SVG replaces the stored depiction."
              : "Create links this compound in the Atlas molecule registry. Upload NEXAFS datasets separately from Contribute NEXAFS."}
          </p>
          <Button
            type="submit"
            variant="primary"
            isDisabled={isSubmitting || pendingLookup !== null}
            className="focus-visible:ring-accent inline-flex items-center gap-2 focus:outline-none focus-visible:ring-2"
            aria-label={isSubmitting ? "Saving registry entry" : "Save registry entry"}
          >
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <DocumentArrowUpIcon className="h-4 w-4 shrink-0" />
                <span>
                  {editingMoleculeId ? "Save registry entry" : "Create registry entry"}
                </span>
              </>
            )}
          </Button>
        </div>

        {submitStatus.type ? (
          <div
            role="alert"
            className={
              submitStatus.type === "success"
                ? "border-success/50 bg-success/10 text-foreground rounded-xl border p-4"
                : "border-error/50 bg-error/10 text-foreground rounded-xl border p-4"
            }
          >
            {submitStatus.message}
          </div>
        ) : null}
      </Form>
    </>
  );
}
