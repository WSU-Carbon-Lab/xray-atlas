import type { MoleculeFacetSelection } from "./types";

const BOOL_KEYS = ["hasData", "hasCas", "hasPubchem"] as const;

export function emptyMoleculeFacetSelection(): MoleculeFacetSelection {
  return {
    tagIds: [],
    hasExperimentData: false,
    hasCas: false,
    hasPubchem: false,
  };
}

export function writeMoleculeFacetParams(
  sp: URLSearchParams,
  sel: MoleculeFacetSelection,
): void {
  if (sel.tagIds.length > 0) {
    sp.set("tags", [...sel.tagIds].sort().join(","));
  } else {
    sp.delete("tags");
  }
  for (const key of BOOL_KEYS) {
    const active =
      key === "hasData"
        ? sel.hasExperimentData
        : key === "hasCas"
          ? sel.hasCas
          : sel.hasPubchem;
    if (active) {
      sp.set(key, "1");
    } else {
      sp.delete(key);
    }
  }
}

function parseBoolParam(sp: URLSearchParams, key: string): boolean {
  const raw = sp.get(key);
  return raw === "1" || raw === "true";
}

export function readMoleculeFacetParams(
  sp: URLSearchParams,
): MoleculeFacetSelection {
  const tagsRaw = sp.get("tags");
  return {
    tagIds: tagsRaw ? tagsRaw.split(",").filter(Boolean) : [],
    hasExperimentData: parseBoolParam(sp, "hasData"),
    hasCas: parseBoolParam(sp, "hasCas"),
    hasPubchem: parseBoolParam(sp, "hasPubchem"),
  };
}

export function moleculeFacetSelectionToBrowseFilters(
  sel: MoleculeFacetSelection,
): {
  tagIds: string[];
  hasExperimentData?: boolean;
  hasCas?: boolean;
  hasPubchem?: boolean;
} {
  return {
    tagIds: sel.tagIds,
    ...(sel.hasExperimentData ? { hasExperimentData: true } : {}),
    ...(sel.hasCas ? { hasCas: true } : {}),
    ...(sel.hasPubchem ? { hasPubchem: true } : {}),
  };
}
