import type { CSVColumnMappings, PrimaryRepresentation } from "../types";

export type ColumnFillStatus = "empty" | "partial" | "filled";

const FILLED_FRACTION = 0.99;

function normHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\[\]]/g, "");
}

function finiteFraction(
  rows: Record<string, unknown>[],
  column: string | undefined,
): number {
  if (!column || rows.length === 0) {
    return 0;
  }
  let finite = 0;
  for (const row of rows) {
    const raw = row[column];
    if (raw === undefined || raw === null || raw === "") {
      continue;
    }
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? parseFloat(raw.trim())
          : Number.NaN;
    if (Number.isFinite(n)) {
      finite += 1;
    }
  }
  return finite / rows.length;
}

/**
 * Classifies each mapped spectrum column as empty, partial, or filled from finite-value fraction.
 */
export function classifyColumnFillStatus(
  rows: Record<string, unknown>[],
  mappings: CSVColumnMappings,
): Record<string, ColumnFillStatus> {
  const keys = [
    mappings.energy,
    mappings.absorption,
    mappings.theta,
    mappings.phi,
    mappings.i0,
    mappings.od,
    mappings.massabsorption,
    mappings.beta,
    mappings.delta,
    mappings.f2,
    mappings.epsilon2,
    mappings.chi2,
  ].filter((k): k is string => Boolean(k));

  const out: Record<string, ColumnFillStatus> = {};
  for (const key of keys) {
    const frac = finiteFraction(rows, key);
    if (frac >= FILLED_FRACTION) {
      out[key] = "filled";
    } else if (frac > 0) {
      out[key] = "partial";
    } else {
      out[key] = "empty";
    }
  }
  return out;
}

function columnFilled(
  status: Record<string, ColumnFillStatus>,
  column: string | undefined,
): boolean {
  if (!column) {
    return false;
  }
  return status[column] === "filled";
}

function isMuLikeAbsorptionColumn(
  absorptionColumn: string,
  mappings: CSVColumnMappings,
): boolean {
  const n = normHeader(absorptionColumn);
  if (n === "mu" || n.includes("absorption") || n === "abs") {
    return true;
  }
  const dedicated = [
    mappings.beta,
    mappings.od,
    mappings.massabsorption,
    mappings.f2,
    mappings.epsilon2,
    mappings.chi2,
  ].filter(Boolean);
  return !dedicated.includes(absorptionColumn);
}

export type PrimaryInferenceResult = {
  primaryRepresentation: PrimaryRepresentation;
  absorptionColumn: string;
  needsExplicitChoice: boolean;
};

const PROCESSED_CANDIDATE_SPECS: Array<{
  representation: PrimaryRepresentation;
  columnKey: keyof Pick<
    CSVColumnMappings,
    "beta" | "massabsorption" | "od" | "f2" | "epsilon2" | "chi2"
  >;
}> = [
  { representation: "beta", columnKey: "beta" },
  { representation: "mass_absorption", columnKey: "massabsorption" },
  { representation: "od", columnKey: "od" },
  { representation: "f2", columnKey: "f2" },
  { representation: "epsilon2", columnKey: "epsilon2" },
  { representation: "chi2", columnKey: "chi2" },
];

/**
 * Resolves the CSV column that holds the declared primary trace for parsing and hub conversion.
 */
export function resolvePrimaryAbsorptionColumn(
  mappings: CSVColumnMappings,
  primaryRepresentation: PrimaryRepresentation,
): string | undefined {
  switch (primaryRepresentation) {
    case "beta":
      return mappings.beta ?? mappings.absorption ?? undefined;
    case "mass_absorption":
      return mappings.massabsorption ?? mappings.absorption ?? undefined;
    case "od":
      return mappings.od ?? mappings.absorption ?? undefined;
    case "f2":
      return mappings.f2 ?? mappings.absorption ?? undefined;
    case "epsilon2":
      return mappings.epsilon2 ?? mappings.absorption ?? undefined;
    case "chi2":
      return mappings.chi2 ?? mappings.absorption ?? undefined;
    case "raw_mu":
      return mappings.absorption ?? undefined;
    default: {
      const _exhaustive: never = primaryRepresentation;
      return _exhaustive;
    }
  }
}

/**
 * Infers primary representation and absorption column from column fill status and header names.
 */
export function inferPrimaryRepresentation(args: {
  mappings: CSVColumnMappings;
  fillStatus: Record<string, ColumnFillStatus>;
}): PrimaryInferenceResult | null {
  const { mappings, fillStatus } = args;
  if (!mappings.energy || fillStatus[mappings.energy] !== "filled") {
    return null;
  }

  const processedCandidates = PROCESSED_CANDIDATE_SPECS.map((spec) => ({
    representation: spec.representation,
    column: mappings[spec.columnKey],
  })).filter(
    (candidate) => candidate.column && columnFilled(fillStatus, candidate.column),
  );

  const muFilled =
    Boolean(mappings.absorption) &&
    columnFilled(fillStatus, mappings.absorption) &&
    isMuLikeAbsorptionColumn(mappings.absorption, mappings);

  if (processedCandidates.length === 1 && !muFilled) {
    const only = processedCandidates[0]!;
    return {
      primaryRepresentation: only.representation,
      absorptionColumn: only.column!,
      needsExplicitChoice: false,
    };
  }

  if (processedCandidates.length >= 1 && muFilled) {
    const preferred = processedCandidates[0]!;
    return {
      primaryRepresentation: preferred.representation,
      absorptionColumn: preferred.column!,
      needsExplicitChoice: true,
    };
  }

  if (processedCandidates.length > 1) {
    const preferred = processedCandidates[0]!;
    return {
      primaryRepresentation: preferred.representation,
      absorptionColumn: preferred.column!,
      needsExplicitChoice: true,
    };
  }

  if (muFilled && mappings.absorption) {
    return {
      primaryRepresentation: "raw_mu",
      absorptionColumn: mappings.absorption,
      needsExplicitChoice: false,
    };
  }

  if (mappings.absorption && fillStatus[mappings.absorption] === "filled") {
    return {
      primaryRepresentation: "raw_mu",
      absorptionColumn: mappings.absorption,
      needsExplicitChoice: false,
    };
  }

  return null;
}

/**
 * Lists uploaded channel keys present with filled data in column mappings.
 */
export function uploadedChannelsFromDataset(args: {
  columnMappings: CSVColumnMappings;
  fillStatus: Record<string, ColumnFillStatus>;
  primaryRepresentation?: PrimaryRepresentation;
}): Array<"rawabs" | "od" | "massabsorption" | "beta"> {
  const channels: Array<"rawabs" | "od" | "massabsorption" | "beta"> = [
    "rawabs",
  ];
  if (
    args.columnMappings.od &&
    args.fillStatus[args.columnMappings.od] === "filled"
  ) {
    channels.push("od");
  }
  if (
    args.columnMappings.massabsorption &&
    args.fillStatus[args.columnMappings.massabsorption] === "filled"
  ) {
    channels.push("massabsorption");
  }
  if (
    args.columnMappings.beta &&
    args.fillStatus[args.columnMappings.beta] === "filled"
  ) {
    channels.push("beta");
  }
  const primary = args.primaryRepresentation;
  if (primary === "f2" || primary === "epsilon2" || primary === "chi2") {
    return channels;
  }
  return channels;
}

/**
 * Reports whether the dataset has a resolvable primary column for upload.
 */
export function datasetHasResolvablePrimary(args: {
  mappings: CSVColumnMappings;
  fillStatus: Record<string, ColumnFillStatus>;
  primaryRepresentation: PrimaryRepresentation;
  primaryRepresentationLocked: boolean;
  primaryInferenceNeedsChoice: boolean;
}): boolean {
  if (args.primaryInferenceNeedsChoice && !args.primaryRepresentationLocked) {
    return false;
  }
  const column = resolvePrimaryAbsorptionColumn(
    args.mappings,
    args.primaryRepresentation,
  );
  if (!column || args.fillStatus[column] !== "filled") {
    return false;
  }
  if (!args.mappings.energy || args.fillStatus[args.mappings.energy] !== "filled") {
    return false;
  }
  return true;
}
