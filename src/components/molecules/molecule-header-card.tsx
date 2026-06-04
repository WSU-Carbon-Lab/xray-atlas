"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Atom,
  Check,
  CheckCircle2,
  Circle,
  Database,
  Eye,
  Heart,
  Pencil,
  X,
} from "lucide-react";
import { Button, Card, Input, ScrollShadow } from "@heroui/react";
import { ContributorsOrEmpty } from "~/components/attribution/contributors-or-empty";
import type { UserWithOrcid } from "~/components/ui/avatar";
import { showToast } from "~/components/ui/toast";
import { moleculeContributorAvatarUsers } from "~/lib/contributor-avatar-display";
import { moleculeOverflowSynonyms } from "~/lib/molecule-synonym-overflow";
import { trpc } from "~/trpc/client";
import type { MoleculeView } from "~/types/molecule";
import {
  CategoryTagGroupEditable,
  getPreviewGradient,
  MoleculeTags,
} from "./category-tags";
import type { HeaderEditForm, MoleculeCardProps } from "./molecule-card-types";
import {
  CAS_FAVICON_URL,
  EDIT_FIELD_CLASS,
  IDENTIFIER_CHIP_CLASS,
  PUBCHEM_FAVICON_URL,
} from "./molecule-display-constants";
import {
  getCommonNames,
  validateCas,
  validatePubChemCid,
} from "./molecule-display-helpers";
import { MoleculeCopyButton } from "./molecule-copy-button";
import { MoleculeImageModal } from "./molecule-image-modal";
import { SynonymChipsWithPopup } from "./synonyms-list";
import { MoleculeImageSVG } from "./molecule-image-svg";

function initEditForm(m: MoleculeView): HeaderEditForm {
  const commonNames = getCommonNames(m);
  return {
    iupacName: m.iupacName ?? "",
    chemicalFormula: m.chemicalFormula ?? "",
    commonNames: commonNames.length > 0 ? commonNames : [m.name ?? ""],
    primaryIndex: 0,
    SMILES: m.SMILES ?? "",
    InChI: m.InChI ?? "",
    casNumber: m.casNumber ?? "",
    pubChemCid: m.pubChemCid ?? "",
    tagIds: (m.moleculeTags ?? []).map((t) => t.id),
  };
}

function HeaderCardIdentifierRow({
  props,
  isEditing,
  editForm,
  setEditForm,
  isPending,
  showMoleculeCopyButtons = true,
}: {
  props: MoleculeCardProps;
  isEditing: boolean;
  editForm: HeaderEditForm | null;
  setEditForm: React.Dispatch<React.SetStateAction<HeaderEditForm | null>>;
  isPending: boolean;
  showMoleculeCopyButtons?: boolean;
}) {
  const m = props.molecule;
  const [debouncedCas, setDebouncedCas] = useState("");
  const [debouncedPubChem, setDebouncedPubChem] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedCas(editForm?.casNumber?.trim() ?? "");
    }, 400);
    return () => clearTimeout(t);
  }, [editForm?.casNumber]);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedPubChem(editForm?.pubChemCid?.trim() ?? "");
    }, 400);
    return () => clearTimeout(t);
  }, [editForm?.pubChemCid]);
  const casFormatValid = !!debouncedCas && validateCas(debouncedCas);
  const pubChemFormatValid =
    !!debouncedPubChem && validatePubChemCid(debouncedPubChem);
  const { data: casValidation } = trpc.external.validateCasNumber.useQuery(
    { casNumber: debouncedCas },
    { enabled: isEditing && casFormatValid },
  );
  const { data: pubChemValidation } = trpc.external.validatePubChemCid.useQuery(
    { cid: debouncedPubChem },
    { enabled: isEditing && pubChemFormatValid },
  );
  const casApiValid = casValidation?.valid === true;
  const pubChemApiValid = pubChemValidation?.valid === true;
  const inVal = (field: "SMILES" | "InChI" | "casNumber" | "pubChemCid") =>
    isEditing && editForm
      ? editForm[field]
      : field === "SMILES"
        ? (m.SMILES ?? "")
        : field === "InChI"
          ? (m.InChI ?? "")
          : field === "casNumber"
            ? (m.casNumber ?? "")
            : (m.pubChemCid ?? "");
  const setVal = (
    field: "SMILES" | "InChI" | "casNumber" | "pubChemCid",
    value: string,
  ) => {
    setEditForm((f) => (f ? { ...f, [field]: value } : f));
  };
  const casInvalid =
    isEditing &&
    editForm &&
    editForm.casNumber.trim() !== "" &&
    !validateCas(editForm.casNumber);
  const pubChemInvalid =
    isEditing &&
    editForm &&
    editForm.pubChemCid.trim() !== "" &&
    !validatePubChemCid(editForm.pubChemCid);
  const inputBaseClass = `${EDIT_FIELD_CLASS} font-mono text-xs`;
  const chipClass = isEditing ? "" : IDENTIFIER_CHIP_CLASS;
  return (
    <div
      className={`grid grid-cols-2 gap-2 ${isEditing ? "gap-x-3" : ""}`}
      role="group"
    >
      <div
        className={`flex max-w-full min-w-0 items-center ${chipClass} ${showMoleculeCopyButtons ? "gap-1.5" : "gap-1"} ${isEditing ? "" : ""}`}
      >
        <Image
          src={CAS_FAVICON_URL}
          alt="CAS registry icon"
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 object-contain"
          unoptimized
        />
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          CAS
        </span>
        {isEditing && editForm ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={inVal("casNumber")}
                onChange={(e) => setVal("casNumber", e.target.value)}
                disabled={isPending}
                className={`max-w-[140px] min-w-0 ${inputBaseClass} ${casInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : casApiValid ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20" : ""}`}
                aria-label="CAS number"
                aria-invalid={!!casInvalid}
              />
              {casApiValid ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-500"
                  aria-label="CAS number found in registry"
                />
              ) : null}
            </div>
            {casInvalid ? (
              <span className="text-xs text-red-500 dark:text-red-400">
                Invalid CAS format
              </span>
            ) : null}
          </div>
        ) : props.casUrl ? (
          <Link
            href={props.casUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent min-w-0 truncate font-mono text-xs"
            title={m.casNumber ?? ""}
          >
            {m.casNumber ?? "—"}
          </Link>
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.casNumber ?? ""}
          >
            {m.casNumber ?? "—"}
          </span>
        )}
        {showMoleculeCopyButtons ? (
          <MoleculeCopyButton
            text={inVal("casNumber") || "—"}
            label="CAS number"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-full min-w-0 items-center ${chipClass} ${showMoleculeCopyButtons ? "gap-1.5" : "gap-1"}`}
      >
        <Image
          src={PUBCHEM_FAVICON_URL}
          alt="PubChem registry icon"
          width={16}
          height={16}
          className="h-4 w-4 shrink-0 object-contain"
          unoptimized
        />
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          PubChem
        </span>
        {isEditing && editForm ? (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={inVal("pubChemCid")}
                onChange={(e) => setVal("pubChemCid", e.target.value)}
                disabled={isPending}
                className={`max-w-[140px] min-w-0 ${inputBaseClass} ${pubChemInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : pubChemApiValid ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20" : ""}`}
                aria-label="PubChem CID"
                aria-invalid={!!pubChemInvalid}
              />
              {pubChemApiValid ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-500"
                  aria-label="PubChem compound found"
                />
              ) : null}
            </div>
            {pubChemInvalid ? (
              <span className="text-xs text-red-500 dark:text-red-400">
                Invalid PubChem CID
              </span>
            ) : null}
          </div>
        ) : props.pubChemUrl ? (
          <Link
            href={props.pubChemUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-secondary hover:text-accent min-w-0 truncate font-mono text-xs"
            title={m.pubChemCid ?? ""}
          >
            {m.pubChemCid ?? "—"}
          </Link>
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.pubChemCid ?? ""}
          >
            {m.pubChemCid ?? "—"}
          </span>
        )}
        {showMoleculeCopyButtons ? (
          <MoleculeCopyButton
            text={inVal("pubChemCid") || "—"}
            label="PubChem CID"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-full min-w-0 items-center ${chipClass} ${showMoleculeCopyButtons ? "gap-1.5" : "gap-1"}`}
      >
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          InChI
        </span>
        {isEditing && editForm ? (
          <Input
            type="text"
            value={inVal("InChI")}
            onChange={(e) => setVal("InChI", e.target.value)}
            disabled={isPending}
            className={`max-w-[200px] min-w-0 ${inputBaseClass}`}
            aria-label="InChI"
          />
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.InChI ?? ""}
          >
            {m.InChI ? m.InChI : "—"}
          </span>
        )}
        {showMoleculeCopyButtons ? (
          <MoleculeCopyButton
            text={inVal("InChI") || "—"}
            label="InChI"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
      <div
        className={`flex max-w-full min-w-0 items-center ${chipClass} ${showMoleculeCopyButtons ? "gap-1.5" : "gap-1"}`}
      >
        <span className="text-text-tertiary shrink-0 text-xs font-medium">
          SMILES
        </span>
        {isEditing && editForm ? (
          <Input
            type="text"
            value={inVal("SMILES")}
            onChange={(e) => setVal("SMILES", e.target.value)}
            disabled={isPending}
            className={`max-w-[200px] min-w-0 ${inputBaseClass}`}
            aria-label="SMILES"
          />
        ) : (
          <span
            className="text-text-secondary min-w-0 truncate font-mono text-xs"
            title={m.SMILES ?? ""}
          >
            {m.SMILES ? m.SMILES : "—"}
          </span>
        )}
        {showMoleculeCopyButtons ? (
          <MoleculeCopyButton
            text={inVal("SMILES") || "—"}
            label="SMILES"
            copiedLabel={props.copiedText}
            onCopy={props.handleCopy}
            size="inline"
          />
        ) : null}
      </div>
    </div>
  );
}

function SynonymsEditBlock({
  commonNames,
  primaryIndex,
  onCommonNamesChange,
  onPrimaryIndexChange,
  onSynonymAdded,
}: {
  commonNames: string[];
  primaryIndex: number;
  onCommonNamesChange: (names: string[]) => void;
  onPrimaryIndexChange: (index: number) => void;
  onSynonymAdded?: (synonym: string) => void;
}) {
  const [newSynonym, setNewSynonym] = useState("");
  const addSynonym = () => {
    const trimmed = newSynonym.trim();
    if (trimmed && !commonNames.includes(trimmed)) {
      onCommonNamesChange([...commonNames, trimmed]);
      onSynonymAdded?.(trimmed);
      setNewSynonym("");
    }
  };
  const removeAt = (i: number) => {
    const next = commonNames.filter((_, j) => j !== i);
    onCommonNamesChange(next);
    if (primaryIndex >= next.length && next.length > 0) {
      onPrimaryIndexChange(next.length - 1);
    } else if (primaryIndex > i) {
      onPrimaryIndexChange(primaryIndex - 1);
    } else if (primaryIndex === i && next.length > 0) {
      onPrimaryIndexChange(0);
    }
  };
  return (
    <div className="space-y-1.5">
      <span className="text-text-secondary text-sm font-medium">
        Synonyms (first is primary)
      </span>
      <ul
        className={`${EDIT_FIELD_CLASS} flex max-h-[180px] min-h-[44px] flex-col gap-1 overflow-y-auto p-2`}
      >
        {commonNames.length === 0 ? (
          <li className="text-text-tertiary py-2 text-center text-sm">
            No synonyms. Add one below.
          </li>
        ) : (
          commonNames.map((syn, i) => (
            <li
              key={`${i}-${syn}`}
              className="odd:bg-surface-2/50 dark:odd:bg-surface-3/30 flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <button
                type="button"
                onClick={() => onPrimaryIndexChange(i)}
                aria-label={i === primaryIndex ? "Primary" : "Set as primary"}
                className="focus-visible:ring-accent shrink-0 rounded p-1 focus:outline-none focus-visible:ring-2"
              >
                {i === primaryIndex ? (
                  <CheckCircle2
                    className="h-4 w-4 fill-emerald-500 text-emerald-500"
                    aria-hidden
                  />
                ) : (
                  <Circle className="text-text-tertiary h-4 w-4" aria-hidden />
                )}
              </button>
              <span className="text-text-secondary min-w-0 flex-1 truncate text-sm">
                {syn}
                {i === primaryIndex ? (
                  <span className="text-text-tertiary ml-1 text-xs">
                    (primary)
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${syn}`}
                className="focus-visible:ring-accent text-text-tertiary hover:bg-surface-3 hover:text-text-primary shrink-0 rounded p-1 focus:outline-none focus-visible:ring-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={newSynonym}
          onChange={(e) => setNewSynonym(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSynonym();
            }
          }}
          placeholder="Add synonym…"
          aria-label="New synonym"
          className={`min-w-0 flex-1 font-mono ${EDIT_FIELD_CLASS}`}
        />
        <Button
          size="sm"
          variant="secondary"
          onPress={addSynonym}
          isDisabled={!newSynonym.trim()}
          className="focus-visible:ring-accent shrink-0"
          aria-label="Add synonym"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

export const HeaderCard = memo(function HeaderCard({
  props,
}: {
  props: MoleculeCardProps;
}) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.molecules.update.useMutation({
    onSuccess: (_, variables) => {
      if (variables.moleculeId) {
        void utils.molecules.getById.invalidate({ id: variables.moleculeId });
      }
    },
    onError: () => {
      showToast("Failed to save molecule changes", "error", 0);
    },
  });
  const setTagsMutation = trpc.molecules.setTags.useMutation({
    onSuccess: (_, variables) => {
      if (variables?.moleculeId) {
        void utils.molecules.getById.invalidate({ id: variables.moleculeId });
      }
    },
    onError: () => {
      showToast("Failed to save tags", "error", 0);
    },
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState<HeaderEditForm | null>(null);
  const [pendingSynonymLookup, setPendingSynonymLookup] = useState<
    string | null
  >(null);
  const processedLookupRef = useRef<string | null>(null);
  const shouldLookup =
    !!editForm &&
    !!pendingSynonymLookup &&
    (!editForm.casNumber?.trim() || !editForm.pubChemCid?.trim());
  const searchPubchem = trpc.external.searchPubchem.useQuery(
    { query: pendingSynonymLookup ?? "", type: "name" },
    { enabled: shouldLookup },
  );
  useEffect(() => {
    const data = searchPubchem.data?.data;
    if (
      !data ||
      !pendingSynonymLookup ||
      !editForm ||
      processedLookupRef.current === pendingSynonymLookup
    )
      return;
    processedLookupRef.current = pendingSynonymLookup;
    setPendingSynonymLookup(null);
    setEditForm((f) => {
      if (!f) return f;
      return {
        ...f,
        InChI: f.InChI?.trim() ? f.InChI : (data.inchi ?? "").trim() || f.InChI,
        SMILES: f.SMILES?.trim()
          ? f.SMILES
          : (data.smiles ?? "").trim() || f.SMILES,
        casNumber:
          f.casNumber?.trim() || (data.casNumber ?? "").trim() || f.casNumber,
        pubChemCid:
          f.pubChemCid?.trim() ||
          (data.pubChemCid ?? "").trim() ||
          f.pubChemCid,
        chemicalFormula: f.chemicalFormula?.trim()
          ? f.chemicalFormula
          : (data.chemicalFormula ?? "").trim() || f.chemicalFormula,
      };
    });
  }, [searchPubchem.data, pendingSynonymLookup, editForm]);
  const handleSynonymAdded = (synonym: string) => {
    if (
      !editForm ||
      (editForm.casNumber?.trim() && editForm.pubChemCid?.trim())
    )
      return;
    setPendingSynonymLookup(synonym);
  };
  const avatarUsers: UserWithOrcid[] = moleculeContributorAvatarUsers(
    props.molecule,
  );
  const previewGradient = getPreviewGradient(props.molecule);
  const hasImage = Boolean(props.molecule.imageUrl?.trim());
  const experimentCount = props.molecule.experimentCount ?? 0;
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const handleEnterEdit = () => {
    setEditForm(initEditForm(props.molecule));
    setIsEditMode(true);
  };

  const handleDone = () => {
    if (!editForm) return;
    const m = props.molecule;
    const orderedCommonNames =
      editForm.commonNames.length > 0
        ? [
            editForm.commonNames[editForm.primaryIndex] ??
              editForm.commonNames[0],
            ...editForm.commonNames.filter(
              (_, i) => i !== editForm.primaryIndex,
            ),
          ].filter((s): s is string => typeof s === "string" && s.length > 0)
        : [];
    const updatePayload = {
      moleculeId: m.id,
      iupacName: editForm.iupacName.trim() || undefined,
      chemicalFormula: editForm.chemicalFormula.trim() || undefined,
      commonNames:
        orderedCommonNames.length > 0 ? orderedCommonNames : undefined,
      SMILES: editForm.SMILES.trim() || undefined,
      InChI: editForm.InChI.trim() || undefined,
      casNumber: editForm.casNumber.trim() || null,
      pubChemCid: editForm.pubChemCid.trim() || null,
    };
    const tagPayload = { moleculeId: m.id, tagIds: editForm.tagIds };
    setIsEditMode(false);
    setEditForm(null);
    setPendingSynonymLookup(null);
    processedLookupRef.current = null;
    updateMutation.mutate(updatePayload);
    setTagsMutation.mutate(tagPayload);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditForm(null);
    setPendingSynonymLookup(null);
    processedLookupRef.current = null;
  };

  const showLinkOrcid = props.isSignedIn && !props.canEdit;

  return (
    <>
      <Card
        className={`group border-border-default hover:border-border-strong dark:border-border-default dark:hover:border-border-strong flex w-full flex-col rounded-2xl border bg-zinc-50 shadow-sm transition-[border-color,box-shadow] duration-200 hover:shadow-md sm:flex-row dark:bg-zinc-800 ${
          isEditMode ? "overflow-visible" : "overflow-hidden"
        }`}
      >
        <div
          className="group/image relative flex h-32 w-full shrink-0 overflow-hidden rounded-lg bg-white sm:h-auto sm:min-h-[100px] sm:w-[32%] dark:bg-black"
          aria-hidden
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setImageModalOpen(true);
            }}
            className="flex h-full w-full cursor-pointer items-center justify-center p-2 sm:p-3"
            aria-label="View molecule structure"
          >
            {hasImage ? (
              <div className="pointer-events-none flex h-full w-full items-center justify-center">
                <MoleculeImageSVG
                  imageUrl={props.molecule.imageUrl ?? ""}
                  name={props.primaryName}
                  className="h-full w-full motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-105 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-contain"
                />
              </div>
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-linear-to-br ${previewGradient}`}
              >
                <Atom
                  className="h-12 w-12 text-white/80 drop-shadow-lg motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:group-hover/image:scale-110 motion-safe:group-hover/image:opacity-100 sm:h-14 sm:w-14"
                  strokeWidth={1}
                  aria-hidden
                />
              </div>
            )}
          </button>
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center gap-1 p-2 sm:p-3"
            onClick={(e) => e.stopPropagation()}
            role="group"
            aria-label="Chemical formula"
          >
            <span
              className="shrink-0 rounded border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-sm text-slate-800 tabular-nums dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              title="Chemical formula"
            >
              {props.molecule.chemicalFormula}
            </span>
            {!isEditMode ? (
              <MoleculeCopyButton
                text={props.molecule.chemicalFormula ?? ""}
                label="Chemical formula"
                copiedLabel={props.copiedText}
                onCopy={props.handleCopy}
                size="inline"
                className="shrink-0 rounded-md bg-slate-100/90 dark:bg-slate-800/90"
              />
            ) : null}
          </div>
          <div
            className="rounded-b-lg absolute inset-x-0 bottom-0 flex justify-end bg-white/60 px-3 py-3 text-slate-900 backdrop-blur-md dark:bg-black/60 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
            aria-hidden
          >
            <ContributorsOrEmpty users={avatarUsers} overlay />
          </div>
        </div>
        <MoleculeImageModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          hasImage={hasImage}
          imageUrl={props.molecule.imageUrl ?? ""}
          primaryName={props.primaryName}
          chemicalFormula={props.molecule.chemicalFormula}
          previewGradient={previewGradient}
        />
        <Card.Content className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
          <div
            className={`min-w-0 space-y-3 ${isEditMode ? "min-h-[260px] flex-1" : ""}`}
          >
            {isEditMode && editForm ? (
              <>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="header-iupac"
                    className="text-text-secondary text-sm font-medium"
                  >
                    IUPAC name
                  </label>
                  <Input
                    id="header-iupac"
                    type="text"
                    value={editForm.iupacName}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, iupacName: e.target.value } : f,
                      )
                    }
                    className={`w-full min-w-0 font-mono ${EDIT_FIELD_CLASS}`}
                    aria-label="IUPAC name"
                  />
                </div>
                <SynonymsEditBlock
                  commonNames={editForm.commonNames}
                  primaryIndex={editForm.primaryIndex}
                  onCommonNamesChange={(commonNames) =>
                    setEditForm((f) => (f ? { ...f, commonNames } : f))
                  }
                  onPrimaryIndexChange={(primaryIndex) =>
                    setEditForm((f) => (f ? { ...f, primaryIndex } : f))
                  }
                  onSynonymAdded={handleSynonymAdded}
                />
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="header-formula"
                    className="text-text-secondary text-sm font-medium"
                  >
                    Formula
                  </label>
                  <Input
                    id="header-formula"
                    type="text"
                    value={editForm.chemicalFormula}
                    onChange={(e) =>
                      setEditForm((f) =>
                        f ? { ...f, chemicalFormula: e.target.value } : f,
                      )
                    }
                    className={`max-w-[200px] min-w-0 font-mono ${EDIT_FIELD_CLASS}`}
                    aria-label="Chemical formula"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex w-fit items-center gap-2">
                  <h1 className="text-text-primary text-xl leading-tight font-bold sm:text-2xl">
                    {props.primaryName}
                  </h1>
                  <MoleculeCopyButton
                    text={props.primaryName}
                    label="Primary name"
                    copiedLabel={props.copiedText}
                    onCopy={props.handleCopy}
                    size="inline"
                  />
                </div>
                {moleculeOverflowSynonyms(props.orderedSynonyms, {
                  primaryName: props.primaryName,
                }).length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <SynonymChipsWithPopup
                      synonyms={props.orderedSynonyms}
                      primaryName={props.primaryName}
                      maxSynonyms={5}
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-600">
            <HeaderCardIdentifierRow
              props={props}
              isEditing={isEditMode}
              editForm={editForm}
              setEditForm={setEditForm}
              isPending={updateMutation.isPending}
              showMoleculeCopyButtons={!isEditMode}
            />
          </div>
          {!isEditMode && props.molecule.iupacName ? (
            <div
              className={`flex items-start gap-2 ${IDENTIFIER_CHIP_CLASS} min-w-0`}
            >
              <ScrollShadow
                className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
                hideScrollBar
              >
                <p className="text-text-tertiary text-sm leading-relaxed wrap-break-word">
                  {props.molecule.iupacName}
                </p>
              </ScrollShadow>
              <MoleculeCopyButton
                text={props.molecule.iupacName}
                label="IUPAC name"
                copiedLabel={props.copiedText}
                onCopy={props.handleCopy}
                size="inline"
              />
            </div>
          ) : null}
          <div className="min-w-0 border-t border-zinc-200 pt-3 dark:border-zinc-600">
            {isEditMode && editForm ? (
              <CategoryTagGroupEditable
                tagIds={editForm.tagIds}
                onTagIdsChange={(tagIds) =>
                  setEditForm((f) => (f ? { ...f, tagIds } : f))
                }
                label="Tags"
                className="min-w-0"
                inlineLayout
              />
            ) : (props.molecule.moleculeTags?.length ?? 0) > 0 ? (
              <div>
                <span className="text-text-secondary mb-2 block text-sm font-medium">
                  Tags
                </span>
                <MoleculeTags molecule={props.molecule} />
              </div>
            ) : null}
          </div>
          <footer
            className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-600"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center gap-4">
              <span
                className="flex items-center gap-1.5 text-sm text-sky-500 tabular-nums"
                title="Views"
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                {props.molecule.viewCount ?? 0}
              </span>
              <div
                className={`flex items-center gap-1.5 text-sm tabular-nums ${
                  props.realtimeUserHasUpvoted
                    ? "font-medium text-pink-500"
                    : "text-text-tertiary"
                }`}
              >
                {props.molecule.id && props.isSignedIn ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    isIconOnly
                    aria-label={
                      props.realtimeUserHasUpvoted ? "Unfavorite" : "Favorite"
                    }
                    isDisabled={props.favoriteMutation.isPending}
                    onPress={props.handleFavorite}
                    className={`focus-visible:ring-accent -m-1 ${
                      props.realtimeUserHasUpvoted
                        ? "text-pink-500"
                        : "text-text-tertiary"
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 shrink-0 ${
                        props.realtimeUserHasUpvoted
                          ? "fill-pink-500 text-pink-500"
                          : ""
                      }`}
                      aria-hidden
                    />
                  </Button>
                ) : (
                  <Heart
                    className={`h-4 w-4 shrink-0 ${
                      props.realtimeUserHasUpvoted
                        ? "fill-pink-500 text-pink-500"
                        : ""
                    }`}
                    aria-hidden
                  />
                )}
                {props.realtimeUpvoteCount}
              </div>
              <span
                className="flex items-center gap-1.5 text-sm text-amber-500 tabular-nums"
                title="Datasets"
              >
                <Database className="h-4 w-4 shrink-0" aria-hidden />
                {experimentCount >= 1000
                  ? `${(experimentCount / 1000).toFixed(1)}k`
                  : experimentCount}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {showLinkOrcid ? (
                <Link
                  href="/api/auth/link-account?provider=orcid"
                  className="text-accent dark:text-accent-light text-sm font-medium hover:underline"
                >
                  Link ORCID to edit this molecule
                </Link>
              ) : null}
              {props.canEdit && !isEditMode ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={handleEnterEdit}
                  className="focus-visible:ring-accent inline-flex items-center gap-2"
                >
                  <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                  Edit
                </Button>
              ) : null}
              {isEditMode ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={handleCancelEdit}
                    className="focus-visible:ring-accent inline-flex items-center gap-2"
                  >
                    <X className="h-4 w-4 shrink-0 align-middle" aria-hidden />
                    <span>Cancel</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={handleDone}
                    isDisabled={
                      updateMutation.isPending || setTagsMutation.isPending
                    }
                    className="focus-visible:ring-accent inline-flex items-center gap-2"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 align-middle"
                      aria-hidden
                    />
                    <span>Submit</span>
                  </Button>
                </>
              ) : null}
            </div>
          </footer>
        </Card.Content>
      </Card>
    </>
  );
});
