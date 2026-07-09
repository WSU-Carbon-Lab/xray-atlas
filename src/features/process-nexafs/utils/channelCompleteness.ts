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

  const muFilled =
    mappings.absorption &&
    fillStatus[mappings.absorption] === "filled" &&
    isMuLikeAbsorptionColumn(mappings.absorption, mappings);

  if (muFilled && mappings.absorption) {
    return {
      primaryRepresentation: "raw_mu",
      absorptionColumn: mappings.absorption,
      needsExplicitChoice: false,
    };
  }

  const candidates: Array<{
    representation: PrimaryRepresentation;
    column: string | undefined;
  }> = [
    { representation: "beta", column: mappings.beta },
    { representation: "mass_absorption", column: mappings.massabsorption },
    { representation: "od", column: mappings.od },
    { representation: "f2", column: mappings.f2 },
    { representation: "epsilon2", column: mappings.epsilon2 },
    { representation: "chi2", column: mappings.chi2 },
  ];

  const filledCandidates = candidates.filter(
    (c) => c.column && columnFilled(fillStatus, c.column),
  );

  if (filledCandidates.length === 1) {
    const only = filledCandidates[0]!;
    return {
      primaryRepresentation: only.representation,
      absorptionColumn: only.column!,
      needsExplicitChoice: false,
    };
  }

  if (filledCandidates.length > 1) {
    const first = filledCandidates[0]!;
    return {
      primaryRepresentation: first.representation,
      absorptionColumn: first.column!,
      needsExplicitChoice: true,
    };
  }

  if (
    mappings.absorption &&
    fillStatus[mappings.absorption] === "filled"
  ) {
    return {
      primaryRepresentation: "raw_mu",
      absorptionColumn: mappings.absorption,
      needsExplicitChoice: false,
    };
  }

  return null;
}

/**
 * Lists uploaded channel keys present with filled data in spectrum points or column mappings.
 */
export function uploadedChannelsFromDataset(args: {
  columnMappings: CSVColumnMappings;
  fillStatus: Record<string, ColumnFillStatus>;
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
  return channels;
}
