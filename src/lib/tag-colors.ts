import type { CSSProperties } from "react";

export const TAG_COLOR_TO_CHIP: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-800 dark:bg-blue-500/30 dark:text-blue-200",
  green:
    "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200",
  pink: "bg-rose-500/20 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200",
  red: "bg-red-500/20 text-red-800 dark:bg-red-500/30 dark:text-red-200",
  orange:
    "bg-amber-500/20 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200",
  purple:
    "bg-violet-500/20 text-violet-800 dark:bg-violet-500/30 dark:text-violet-200",
  gray: "bg-slate-500/20 text-slate-800 dark:bg-slate-500/30 dark:text-slate-200",
  grey: "bg-slate-500/20 text-slate-800 dark:bg-slate-500/30 dark:text-slate-200",
  slate:
    "bg-slate-500/20 text-slate-800 dark:bg-slate-500/30 dark:text-slate-200",
  emerald:
    "bg-emerald-500/20 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-200",
  violet:
    "bg-violet-500/20 text-violet-800 dark:bg-violet-500/30 dark:text-violet-200",
  amber:
    "bg-amber-500/20 text-amber-800 dark:bg-amber-500/30 dark:text-amber-200",
  rose: "bg-rose-500/20 text-rose-800 dark:bg-rose-500/30 dark:text-rose-200",
};

const SLUG_TO_COLOR: Record<string, string> = {
  opv: "green",
  polymer: "gray",
  "small-molecule": "gray",
  small_molecule: "gray",
  smallmolecule: "gray",
};

export const DEFAULT_TAG_CHIP =
  "bg-slate-500/20 text-slate-800 dark:bg-slate-500/30 dark:text-slate-200";

const TAG_COLOR_TO_GRADIENT: Record<string, string> = {
  blue: "from-blue-500/20 to-cyan-500/20",
  green: "from-emerald-500/20 to-teal-500/20",
  pink: "from-rose-500/20 to-pink-500/20",
  red: "from-rose-500/20 to-orange-500/20",
  orange: "from-amber-500/20 to-orange-500/20",
  purple: "from-violet-500/20 to-purple-500/20",
  gray: "from-slate-500/20 to-slate-600/20",
  grey: "from-slate-500/20 to-slate-600/20",
};

export function getTagGradient(tag: {
  color?: string | null;
  slug?: string;
}): string | null {
  const colorRaw = tag.color?.trim() ?? "";
  const colorKey = colorRaw.toLowerCase();
  if (colorKey && TAG_COLOR_TO_GRADIENT[colorKey]) {
    return TAG_COLOR_TO_GRADIENT[colorKey];
  }
  const slugKey = (tag.slug ?? "").toLowerCase().replace(/_/g, "-");
  const mapped =
    SLUG_TO_COLOR[slugKey] ?? SLUG_TO_COLOR[slugKey.replace(/-/g, "")];
  if (mapped && TAG_COLOR_TO_GRADIENT[mapped]) {
    return TAG_COLOR_TO_GRADIENT[mapped] ?? null;
  }
  return null;
}

export function getTagChipClass(tag: {
  color?: string | null;
  slug?: string;
}): string {
  const colorRaw = tag.color?.trim() ?? "";
  const colorKey = colorRaw.toLowerCase();
  if (colorKey && TAG_COLOR_TO_CHIP[colorKey]) {
    return TAG_COLOR_TO_CHIP[colorKey];
  }
  if (colorKey.startsWith("#")) {
    return "";
  }
  const slugKey = (tag.slug ?? "").toLowerCase().replace(/_/g, "-");
  const mapped =
    SLUG_TO_COLOR[slugKey] ?? SLUG_TO_COLOR[slugKey.replace(/-/g, "")];
  if (mapped && TAG_COLOR_TO_CHIP[mapped]) {
    return TAG_COLOR_TO_CHIP[mapped]!;
  }
  return DEFAULT_TAG_CHIP;
}

export function getTagInlineStyle(tag: {
  color?: string | null;
}): CSSProperties | undefined {
  const colorRaw = tag.color?.trim() ?? "";
  if (colorRaw.startsWith("#") && /^#[0-9A-Fa-f]{3,8}$/.test(colorRaw)) {
    return {
      backgroundColor: `${colorRaw}33`,
      color: colorRaw,
    };
  }
  return undefined;
}
