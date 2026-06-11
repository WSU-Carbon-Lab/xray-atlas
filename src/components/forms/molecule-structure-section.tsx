"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import dynamic from "next/dynamic";
import type {
  MoleculeContributeSketcherPanelHandle,
  StructureLookupContext,
} from "./molecule-contribute-sketcher-panel";
import { useTheme } from "next-themes";
import type { Molecule } from "openchemlib";
import {
  Button,
  Description,
  ErrorMessage,
  Label,
  Spinner,
  Switch,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import type { BookendMarksState } from "~/features/molecule-sketcher";
import { WorkflowMiniDepiction } from "~/features/molecule-sketcher/components/workflow-mini-depiction";
import { prepareMoleculeForDatabase } from "~/features/molecule-sketcher/utils/molecule-graph-editing";
import {
  MOLECULE_STRUCTURE_SVG_ACCEPT,
  isMoleculeStructureSvgFile,
  moleculeSvgMarkupToDataUrl,
} from "~/lib/molecule-svg-upload";
import { MoleculeImageSVG } from "~/components/molecules/molecule-image-svg";
import { FieldTooltip } from "~/components/ui/field-tooltip";

const MoleculeContributeSketcherPanel = dynamic(
  () =>
    import("./molecule-contribute-sketcher-panel").then(
      (mod) => mod.MoleculeContributeSketcherPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-border bg-surface flex min-h-56 items-center justify-center rounded-lg border">
        <Spinner className="h-6 w-6" />
      </div>
    ),
  },
);

const DEPICTION_FRAME_CLASS =
  "border-border bg-surface relative flex min-h-56 w-full min-w-0 items-center justify-center overflow-hidden rounded-lg border";

const DEPICTION_MEDIA_CLASS =
  "mx-auto h-full w-full max-h-[280px] object-contain p-4";

const DEPICTION_COLUMN_CLASS = "mx-auto w-full min-w-0 max-w-lg";

const STRUCTURE_ACTION_ROW_CLASS =
  "flex flex-wrap items-center justify-center gap-2";

const CLEAR_STRUCTURE_BUTTON_CLASS =
  "text-muted h-7 min-h-7 px-2 text-xs";

export type MoleculeStructureSectionProps = {
  smiles: string;
  onSmilesChange: (smiles: string) => void;
  imagePreview: string;
  onImagePreviewChange: (preview: string) => void;
  onSvgDataUrlReady: (dataUrl: string | null) => void;
  registryStub: boolean;
  onRegistryStubChange?: (stub: boolean) => void;
  showRegistryStubToggle?: boolean;
  structureDisabled?: boolean;
  structureValidationError?: string | null;
  onSketchBookendsChange?: (bookends: BookendMarksState) => void;
  /** Invokes Atlas/PubChem identifier lookup from the current SMILES without opening the sketcher. */
  onLookupIdentifiers?: () => void;
  /** Receives expanded lookup SMILES and component fragments from the sketcher. */
  onStructureLookupContextChange?: (context: StructureLookupContext) => void;
  /** When true, disables the structure lookup action while an external lookup is in flight. */
  lookupIdentifiersBusy?: boolean;
};

/**
 * Structure card for the molecule registry form: SMILES depiction preview,
 * optional embedded sketcher, and SVG-only upload.
 */
export function MoleculeStructureSection({
  smiles,
  onSmilesChange,
  imagePreview,
  onImagePreviewChange,
  onSvgDataUrlReady,
  registryStub,
  onRegistryStubChange,
  showRegistryStubToggle = false,
  structureDisabled = false,
  structureValidationError = null,
  onSketchBookendsChange,
  onLookupIdentifiers,
  onStructureLookupContextChange,
  lookupIdentifiersBusy = false,
}: MoleculeStructureSectionProps) {
  const { resolvedTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sketcherOpen, setSketcherOpen] = useState(false);
  const [sketcherMounted, setSketcherMounted] = useState(false);
  const [sketchPendingCommit, setSketchPendingCommit] = useState(false);
  const [smilesCompareMode, setSmilesCompareMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sketcherPanelRef = useRef<MoleculeContributeSketcherPanelHandle>(null);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    if (!imagePreview.trim()) {
      setSmilesCompareMode(false);
    }
  }, [imagePreview]);

  const isDark = themeMounted && resolvedTheme === "dark";
  const trimmedSmiles = smiles.trim();
  const hasCommittedRegistrySvg = imagePreview.trim().length > 0;
  const showSmilesLivePreview =
    trimmedSmiles.length > 0 && !registryStub && !hasCommittedRegistrySvg;
  const canCompareWithSmiles =
    hasCommittedRegistrySvg && trimmedSmiles.length > 0 && !registryStub;
  const showSmilesComparePanel =
    canCompareWithSmiles && smilesCompareMode;

  const prepareSmilesDepiction = useCallback((mol: Molecule) => {
    prepareMoleculeForDatabase(mol);
  }, []);

  const handleSvgFile = useCallback(
    (file: File) => {
      setUploadError(null);
      if (!isMoleculeStructureSvgFile(file)) {
        setUploadError(
          "Only SVG structure files are accepted. PNG, JPEG, GIF, and WebP are rejected.",
        );
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          onImagePreviewChange(reader.result);
          onSvgDataUrlReady(reader.result);
          setSketchPendingCommit(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Could not read the SVG file.");
      };
      reader.readAsDataURL(file);
    },
    [onImagePreviewChange, onSvgDataUrlReady],
  );

  const removeImage = useCallback(() => {
    onImagePreviewChange("");
    onSvgDataUrlReady(null);
    setUploadError(null);
    setSmilesCompareMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onImagePreviewChange, onSvgDataUrlReady]);

  const clearSmilesPreview = useCallback(() => {
    onSmilesChange("");
    setSketchPendingCommit(false);
    setUploadError(null);
    setSmilesCompareMode(false);
  }, [onSmilesChange]);

  const renderClearStructureButton = (
    onPress: () => void,
    ariaLabel: string,
    label = "Clear structure",
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={CLEAR_STRUCTURE_BUTTON_CLASS}
      onPress={onPress}
      isDisabled={structureDisabled}
      aria-label={ariaLabel}
    >
      {label}
    </Button>
  );

  const applySketcherSnapshot = useCallback(
    (svgMarkup: string, canonicalSmiles: string) => {
      const dataUrl = moleculeSvgMarkupToDataUrl(svgMarkup);
      onImagePreviewChange(dataUrl);
      onSvgDataUrlReady(dataUrl);
      if (canonicalSmiles.trim().length > 0) {
        onSmilesChange(canonicalSmiles.trim());
      }
      setUploadError(null);
      setSketchPendingCommit(false);
      queueMicrotask(() => setSketcherOpen(false));
    },
    [onImagePreviewChange, onSmilesChange, onSvgDataUrlReady],
  );

  const openSketcher = useCallback(() => {
    setSketcherMounted(true);
    setSketcherOpen(true);
    setSketchPendingCommit(false);
  }, []);

  const commitSketchSnapshot = useCallback(() => {
    sketcherPanelRef.current?.commitSnapshot();
  }, []);

  const handleSketcherOpenChange = useCallback(
    (selected: boolean) => {
      queueMicrotask(() => {
        if (selected) {
          setSketcherMounted(true);
          setSketchPendingCommit(false);
        } else if (
          smiles.trim().length > 0 &&
          imagePreview.trim().length === 0
        ) {
          setSketchPendingCommit(true);
        }
        setSketcherOpen(selected);
      });
    },
    [imagePreview, smiles],
  );

  const openFilePicker = useCallback(() => {
    if (!structureDisabled) {
      fileInputRef.current?.click();
    }
  }, [structureDisabled]);

  const renderDepictionMedia = (preview: string, alt: string) => {
    if (preview.startsWith("data:image/svg")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL preview
        <img src={preview} alt={alt} className={DEPICTION_MEDIA_CLASS} />
      );
    }
    if (preview.startsWith("http")) {
      return (
        <MoleculeImageSVG
          imageUrl={preview}
          name={alt}
          className={DEPICTION_MEDIA_CLASS}
        />
      );
    }
    return (
      <div
        className={cn(
          DEPICTION_MEDIA_CLASS,
          "flex items-center justify-center [&_svg]:h-auto [&_svg]:max-h-[280px] [&_svg]:w-full [&_svg]:max-w-full",
        )}
        dangerouslySetInnerHTML={{ __html: preview }}
      />
    );
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={MOLECULE_STRUCTURE_SVG_ACCEPT}
      className="sr-only"
      id="molecule-structure-svg-upload"
      disabled={structureDisabled}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          handleSvgFile(file);
        }
      }}
    />
  );

  const handleSvgDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (structureDisabled) {
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (file) {
        handleSvgFile(file);
      }
    },
    [handleSvgFile, structureDisabled],
  );

  const replaceSvgButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onPress={openFilePicker}
      isDisabled={structureDisabled}
    >
      Replace SVG
    </Button>
  );

  const structureSecondaryActions = (
    <div className={cn(DEPICTION_COLUMN_CLASS, STRUCTURE_ACTION_ROW_CLASS)}>
      {canCompareWithSmiles && !showSmilesComparePanel ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onPress={() => setSmilesCompareMode(true)}
          aria-pressed={false}
        >
          Compare: registry SVG vs SMILES preview
        </Button>
      ) : null}
      {replaceSvgButton}
      {renderClearStructureButton(
        removeImage,
        "Clear registry structure depiction",
      )}
    </div>
  );

  const uploadDropZone = (
    <div className={DEPICTION_COLUMN_CLASS}>
      <div
        role="button"
        tabIndex={structureDisabled ? -1 : 0}
        aria-disabled={structureDisabled}
        aria-label="Upload SVG structure file, about 10 megabytes maximum"
        className={cn(
          "border-border hover:border-accent bg-default/20 flex w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors min-h-56",
          structureDisabled && "cursor-not-allowed opacity-60",
        )}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={handleSvgDrop}
      >
        <DocumentArrowUpIcon className="text-accent h-8 w-8 shrink-0" />
        <span className="text-accent shrink-0 text-xs font-semibold tracking-wide uppercase">
          Upload SVG
        </span>
        <p className="text-muted max-w-full px-2 text-xs leading-snug text-balance">
          SVG only, about 10 MB max. Raster formats rejected.
        </p>
      </div>
    </div>
  );

  const smilesPreviewPanel = (
    <div className="flex min-h-0 min-w-0 flex-col gap-2">
      <Label className="text-foreground text-sm font-medium">
        Preview from SMILES
        <FieldTooltip description="Rendered with OpenChemLib using the same CPK-themed SVG pipeline as the molecule sketcher." />
      </Label>
      <div className={DEPICTION_FRAME_CLASS}>
        <WorkflowMiniDepiction
          smiles={trimmedSmiles}
          isDark={isDark}
          width={320}
          height={220}
          fill
          bare
          prepareMolecule={prepareSmilesDepiction}
        />
      </div>
    </div>
  );

  const registryDepictionPanel = (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2",
        !showSmilesComparePanel && DEPICTION_COLUMN_CLASS,
      )}
    >
      <Label className="text-foreground text-sm font-medium">
        Registry depiction
        <FieldTooltip description="Committed structure image stored with this molecule record. Generated from the sketcher or uploaded as SVG." />
      </Label>
      <div
        className={DEPICTION_FRAME_CLASS}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={handleSvgDrop}
      >
        {renderDepictionMedia(imagePreview, "Registry molecule structure")}
      </div>
    </div>
  );

  const depictionContent = (() => {
    if (hasCommittedRegistrySvg) {
      if (showSmilesComparePanel) {
        return (
          <div
            className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch"
            role="group"
            aria-label="Structure compare: SMILES preview and registry depiction"
          >
            {smilesPreviewPanel}
            {registryDepictionPanel}
          </div>
        );
      }
      return (
        <div className="flex w-full min-w-0 flex-col gap-3">
          {registryDepictionPanel}
          {structureSecondaryActions}
        </div>
      );
    }

    if (showSmilesLivePreview) {
      return (
        <div className={cn(DEPICTION_COLUMN_CLASS, "flex flex-col gap-3")}>
          {sketchPendingCommit && sketcherMounted ? (
            <Description className="border-accent/40 bg-accent/5 text-foreground rounded-lg border px-3 py-2 text-sm">
              Your sketch is not committed yet. Generate the registry SVG or
              upload an external file before saving.
            </Description>
          ) : null}
          {smilesPreviewPanel}
          <div className={STRUCTURE_ACTION_ROW_CLASS}>
            {sketcherMounted ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onPress={openSketcher}
                >
                  Open editor
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onPress={commitSketchSnapshot}
                >
                  Use sketch as SVG
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onPress={openFilePicker}
              isDisabled={structureDisabled}
            >
              Upload SVG
            </Button>
            {onLookupIdentifiers ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={onLookupIdentifiers}
                isDisabled={lookupIdentifiersBusy || structureDisabled}
              >
                {lookupIdentifiersBusy ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  "Look up from drawn structure"
                )}
              </Button>
            ) : null}
            {renderClearStructureButton(
              clearSmilesPreview,
              "Clear SMILES structure preview",
            )}
          </div>
        </div>
      );
    }

    return uploadDropZone;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-foreground text-lg font-semibold">
            Structure depiction
          </h2>
          <Description className="text-muted mt-1 text-sm">
            {registryStub
              ? "Registry stub entries defer structure images. Add an SVG later from the molecule page or by editing this record."
              : "Generate from SMILES, draw in the sketcher, or upload an SVG export. Raster formats are not stored."}
          </Description>
        </div>
        <div className="flex flex-col items-end gap-2">
          {showRegistryStubToggle && onRegistryStubChange ? (
            <div className="flex flex-col items-end gap-1">
              <Switch
                isSelected={registryStub}
                onChange={(selected) => {
                  queueMicrotask(() => {
                    onRegistryStubChange(selected);
                    if (selected) {
                      setSketcherOpen(false);
                      onImagePreviewChange("");
                      onSvgDataUrlReady(null);
                    }
                  });
                }}
                size="sm"
                aria-label="Registry stub without structure depiction"
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content>
                  <Label className="text-foreground flex items-center gap-1 text-sm">
                    Registry stub
                    <FieldTooltip description="Save identifiers and formula without SMILES or SVG. Requires PubChem CID or CAS. Add a depiction later from the molecule page." />
                  </Label>
                </Switch.Content>
              </Switch>
              <Description className="text-muted max-w-xs text-right text-xs">
                No structure depiction yet
              </Description>
            </div>
          ) : null}
          {!registryStub ? (
            <Switch
              isSelected={sketcherOpen}
              onChange={handleSketcherOpenChange}
              size="sm"
              aria-label="Show structure editor"
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Switch.Content>
                <Label className="text-foreground text-sm">Draw or edit</Label>
              </Switch.Content>
            </Switch>
          ) : null}
        </div>
      </div>

      {registryStub ? (
        <Description className="text-muted border-border bg-default/20 rounded-lg border px-3 py-2 text-sm">
          Stub mode saves identifiers and formula only. Structure fields may use
          placeholder values until a depiction is added.
        </Description>
      ) : null}

      {sketcherMounted && !registryStub ? (
        <div className={cn(!sketcherOpen && "hidden")} aria-hidden={!sketcherOpen}>
          <MoleculeContributeSketcherPanel
            ref={sketcherPanelRef}
            initialSmiles={trimmedSmiles}
            isDark={isDark}
            onSmilesChange={onSmilesChange}
            onSnapshot={applySketcherSnapshot}
            onBookendsChange={onSketchBookendsChange}
            onStructureLookupContextChange={onStructureLookupContextChange}
          />
        </div>
      ) : null}

      {!registryStub && !sketcherOpen ? (
        <div className="flex w-full min-w-0 flex-col gap-3">
          {showSmilesComparePanel ? (
            <div
              className={cn(
                DEPICTION_COLUMN_CLASS,
                "flex flex-wrap items-center justify-end gap-2 md:max-w-none md:justify-end",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPress={() => setSmilesCompareMode(false)}
              >
                Hide SMILES preview
              </Button>
              {replaceSvgButton}
              {renderClearStructureButton(
                removeImage,
                "Clear registry structure depiction",
              )}
            </div>
          ) : null}
          {fileInput}
          {depictionContent}
        </div>
      ) : null}

      {!registryStub && uploadError ? (
        <ErrorMessage className="text-sm font-medium">{uploadError}</ErrorMessage>
      ) : null}

      {!registryStub && structureValidationError ? (
        <ErrorMessage className="text-sm font-medium" role="alert">
          {structureValidationError}
        </ErrorMessage>
      ) : null}
    </div>
  );
}
