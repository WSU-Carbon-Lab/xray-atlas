/**
 * Shared types for the interactive molecule draw canvas (ChemDraw-style lab).
 * The canvas edits an OpenChemLib molecule whose V2000 molfile string is the
 * editing source of truth; tools and marks here never carry molecule state.
 */

/**
 * Active interaction tool on the draw canvas.
 *
 * - `select`: marquee and click selection; drag selection to move atoms.
 * - `pan`: click-drag anywhere on the canvas to pan the view (hand tool).
 * - `draw`: click empty canvas to add an atom; drag from an atom to sprout a bond
 *   using the active {@link DrawBondKind}; click a bond to retype it to that kind.
 * - `element`: click an atom to open the heteroatom palette.
 * - `erase`: click an atom (cascades its bonds) or a bond to delete it.
 * - `bookend`: click two acyclic single bonds to place `[` and `]` repeat-unit
 *   bookends around the region between them.
 * - `chunk`: click acyclic single bonds to mark block-boundary cuts; fragments
 *   between cuts become labeled BigSMILES-style blocks.
 * - `add-alkyl`: click an atom to open alkyl-tail presets; attaches an
 *   abbreviated CnH2n+1 label on a sprouted carbon (database-style tails).
 */
export type DrawTool =
  | "select"
  | "pan"
  | "draw"
  | "template"
  | "element"
  | "erase"
  | "bookend"
  | "chunk"
  | "add-alkyl";

/** Menu grouping for ring-template presets in the draw toolbar. */
export type RingTemplateCategory = "ring" | "macrocycle" | "cage";

/**
 * Fullerene cage depiction mode on the draw canvas.
 *
 * - `2d`: orthographic front view with rear bonds omitted (catalog snapshot style).
 * - `3d`: perspective projection with grey muted rear bonds (depth tier styling).
 */
export type CageDepictionMode = "2d" | "3d";

/** Preset ring or aromatic template placed from the draw toolbar. */
export interface RingTemplatePreset {
  /** Stable id for toolbar selection state. */
  id: string;
  /** Reader-facing name in the rings menu. */
  name: string;
  /** SMILES fragment parsed by OpenChemLib when placing the template. */
  smiles: string;
  /** Toolbar section: small rings, macrocycles, or Buckminster fullerene cages. */
  category: RingTemplateCategory;
}

/** Small rings and fused aromatics for ChemDraw-style placement. */
export const SMALL_RING_TEMPLATE_PRESETS: readonly RingTemplatePreset[] = [
  { id: "benzene", name: "Benzene", smiles: "c1ccccc1", category: "ring" },
  { id: "cyclohexane", name: "Cyclohexane", smiles: "C1CCCCC1", category: "ring" },
  { id: "cyclopentane", name: "Cyclopentane", smiles: "C1CCCC1", category: "ring" },
  { id: "cyclobutane", name: "Cyclobutane", smiles: "C1CCC1", category: "ring" },
  { id: "cyclopropane", name: "Cyclopropane", smiles: "C1CC1", category: "ring" },
  { id: "cycloheptane", name: "Cycloheptane", smiles: "C1CCCCCC1", category: "ring" },
  { id: "naphthalene", name: "Naphthalene", smiles: "c1ccc2ccccc2c1", category: "ring" },
  { id: "pyridine", name: "Pyridine", smiles: "c1ccncc1", category: "ring" },
  { id: "thiophene", name: "Thiophene", smiles: "c1ccsc1", category: "ring" },
  { id: "furan", name: "Furan", smiles: "c1ccoc1", category: "ring" },
  { id: "pyrrole", name: "Pyrrole", smiles: "c1cc[nH]c1", category: "ring" },
] as const;

/** Curated macrocycle templates for medchem and polymer drawing (large rings and porphyrin). */
export const MACROCYCLE_TEMPLATE_PRESETS: readonly RingTemplatePreset[] = [
  { id: "cyclooctane", name: "Cyclooctane", smiles: "C1CCCCCCC1", category: "macrocycle" },
  { id: "cyclododecane", name: "Cyclododecane", smiles: "C1CCCCCCCCCC1", category: "macrocycle" },
  {
    id: "cyclohexadecane",
    name: "Cyclohexadecane",
    smiles: "C1CCCCCCCCCCCCCC1",
    category: "macrocycle",
  },
  {
    id: "porphyrin",
    name: "Porphyrin",
    smiles: "c1cc2[nH]c1cc1[nH]c(cc1)cc1[nH]c(cc1)cc1[nH]c(c2)cc1",
    category: "macrocycle",
  },
] as const;

/** Buckminster fullerene presets with tabulated SMILES (see {@link cageSmilesForCarbonCount}). */
export const CAGE_TEMPLATE_PRESETS: readonly RingTemplatePreset[] = [
  {
    id: "c60",
    name: "C60",
    smiles:
      "C12=C3C4=C5C6=C1C7=C8C9=C1C%10=C%11C(=C29)C3=C2C3=C4C4=C5C5=C9C6=C7C6=C7C8=C1C1=C8C%10=C%10C%11=C2C2=C3C3=C4C4=C5C5=C%11C%12=C(C6=C95)C7=C1C1=C%12C5=C%11C4=C3C3=C5C(=C81)C%10=C23",
    category: "cage",
  },
  {
    id: "c70",
    name: "C70",
    smiles:
      "C12=C3C4=C5C6=C7C8=C9C%10=C%11C%12=C%13C%10=C%10C8=C5C1=C%10C1=C%13C5=C8C1=C2C1=C3C2=C3C%10=C%13C%14=C3C1=C8C1=C3C5=C%12C5=C8C%11=C%11C9=C7C7=C9C6=C4C2=C2C%10=C4C(=C29)C2=C6C(=C8C8=C9C6=C4C%13=C9C(=C%141)C3=C85)C%11=C27",
    category: "cage",
  },
] as const;

/** All ring, macrocycle, and cage templates for lookup and thumbnail generation. */
export const RING_TEMPLATE_PRESETS: readonly RingTemplatePreset[] = [
  ...SMALL_RING_TEMPLATE_PRESETS,
  ...MACROCYCLE_TEMPLATE_PRESETS,
  ...CAGE_TEMPLATE_PRESETS,
] as const;

/**
 * Preset alkyl tail lengths for the add-alkyl tool. Each entry names a common
 * substituent and gives the carbon count {@link AbbreviatedAlkylTailSpec.carbonCount}
 * used in CnH2n+1 labeling.
 */
export interface AlkylTailPreset {
  /** Reader-facing preset label (for example Me, C12H25). */
  name: string;
  /** Carbon count n in CnH2n+1. */
  carbonCount: number;
}

/** Common alkyl tail presets shown in the add-alkyl popover. */
export const ALKYL_TAIL_PRESETS: readonly AlkylTailPreset[] = [
  { name: "Me", carbonCount: 1 },
  { name: "Et", carbonCount: 2 },
  { name: "Pr", carbonCount: 3 },
  { name: "C6H13", carbonCount: 6 },
  { name: "C12H25", carbonCount: 12 },
] as const;

/**
 * Carbon count for an abbreviated alkyl tail attached via
 * {@link attachAbbreviatedAlkylTail}.
 */
export interface AbbreviatedAlkylTailSpec {
  /** Number of carbons n in CnH2n+1; must be a positive integer. */
  carbonCount: number;
}

/**
 * Layout manipulation mode on the draw canvas (mirrors the structure editor
 * view tools). When active, pointer handling on the canvas applies layout
 * picks or drag transforms instead of the primary {@link DrawTool}.
 */
export type LayoutTool = "translate" | "rotate" | "align" | "pivot" | "cage-orbit";

/**
 * Bond flavor the draw tools create or report. `dative` maps to OpenChemLib's
 * metal-ligand (coordinate) bond type and is rendered as a dashed arrow.
 */
export type DrawBondKind = "single" | "double" | "triple" | "dative";

/** Toolbar bond-kind presets shown in the draw bond popover. */
export interface DrawBondKindOption {
  /** Bond kind applied when drawing or retyping bonds. */
  kind: DrawBondKind;
  /** Reader-facing label in the bond popover. */
  label: string;
}

/** Bond kinds available in the ChemDraw-style bond popover (v1). */
export const DRAW_BOND_KIND_OPTIONS: readonly DrawBondKindOption[] = [
  { kind: "single", label: "Single" },
  { kind: "double", label: "Double" },
  { kind: "triple", label: "Triple" },
  { kind: "dative", label: "Dative" },
] as const;

/**
 * Manual override for rendering a double bond's parallel line placement.
 *
 * - `auto`: ring-aware interior heuristic (ChemDraw / OCL style on rings).
 * - `inside`: inner line toward the ring centroid, or default +normal on chains.
 * - `outside`: inner line on the exterior side of the ring or chain.
 * - `center`: symmetric parallel lines centered on the bond axis (no ring trim).
 */
export type DoubleBondOffsetMode = "auto" | "inside" | "outside" | "center";

/**
 * Bond identified by its two endpoint atom indices in the current molecule.
 * Marks use atom pairs instead of bond indices so additive edits (which never
 * renumber existing atoms in OpenChemLib) keep marks valid; destructive edits
 * clear all marks.
 */
export interface DrawBondMark {
  atomA: number;
  atomB: number;
  /**
   * When true, flips which side of the bond a polymer bookend bracket opens
   * relative to the auto-detected repeat-unit interior.
   */
  openingFlip?: boolean;
}

/**
 * Builds a stable string key for bond-scoped render preferences (double-bond
 * offset modes) from an unordered atom pair.
 */
export function bondMarkKey(atomA: number, atomB: number): string {
  const lo = Math.min(atomA, atomB);
  const hi = Math.max(atomA, atomB);
  return `${lo}:${hi}`;
}
