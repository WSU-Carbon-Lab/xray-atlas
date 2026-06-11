import type { BookendMarksState } from "~/features/molecule-sketcher";
import {
  isPolymerLikeCompoundKind,
  type MoleculeCompoundKind,
} from "~/lib/molecule-compound-kind";
import type { MoleculeUploadData } from "~/types/upload";

/** Sketcher-derived state used when validating polymer structure requirements. */
export interface PolymerSketchValidationState {
  /** Repeat-unit bookend marks from the embedded contribute sketcher. */
  bookends: BookendMarksState;
}

/** Successful polymer structure validation (requirement satisfied or not applicable). */
export interface PolymerStructureValidationSuccess {
  ok: true;
}

/** Failed polymer structure validation with a user-facing message. */
export interface PolymerStructureValidationFailure {
  ok: false;
  message: string;
}

/** Result of {@link validatePolymerStructureRequirement}. */
export type PolymerStructureValidationResult =
  | PolymerStructureValidationSuccess
  | PolymerStructureValidationFailure;

/**
 * Reports whether both polymer repeat-unit bookends are placed on the sketcher
 * canvas.
 *
 * @param bookends - Opening `[` and closing `]` bond marks.
 */
export function hasPolymerBookendPair(bookends: BookendMarksState): boolean {
  return bookends.open !== null && bookends.close !== null;
}

/**
 * Reports whether the contribute form has an SVG depiction ready for upload
 * (sketcher snapshot or explicit SVG file).
 *
 * @param svgDataUrl - Data URL from upload or sketcher export.
 */
export function hasMoleculeStructureSvgUpload(
  svgDataUrl: string | null | undefined,
): boolean {
  return typeof svgDataUrl === "string" && svgDataUrl.trim().length > 0;
}

/**
 * Validates polymer and macromolecule registry entries have a repeat-unit
 * depiction: polymer bookends in the sketcher or an SVG upload. Registry stub
 * mode defers structure and always passes. Small molecules and oligomers are
 * not subject to this rule.
 *
 * @param formData - Current molecule upload form values.
 * @param options - Optional sketcher bookends and SVG data URL from the structure card.
 */
export function validatePolymerStructureRequirement(
  formData: Pick<
    MoleculeUploadData,
    "compoundKind" | "registryStub"
  >,
  options?: {
    sketchState?: PolymerSketchValidationState | null;
    svgDataUrl?: string | null;
  },
): PolymerStructureValidationResult {
  const kind: MoleculeCompoundKind =
    formData.compoundKind ?? "small_molecule";

  if (!isPolymerLikeCompoundKind(kind)) {
    return { ok: true };
  }

  if (formData.registryStub) {
    return { ok: true };
  }

  if (hasMoleculeStructureSvgUpload(options?.svgDataUrl)) {
    return { ok: true };
  }

  const bookends = options?.sketchState?.bookends;
  if (bookends !== undefined && hasPolymerBookendPair(bookends)) {
    return { ok: true };
  }

  return {
    ok: false,
    message:
      "Polymers and macromolecules need a structure depiction: place repeat-unit bookends in the sketcher or upload an SVG (or use sketcher export).",
  };
}
