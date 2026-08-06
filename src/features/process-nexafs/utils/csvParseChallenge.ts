import type { CSVColumnMappings } from "../types";

/**
 * Reasons the automatic CSV → spectrum mapping needs contributor help.
 */
export type CsvParseChallengeCode =
  | "no_columns"
  | "missing_energy"
  | "missing_absorption"
  | "no_numeric_rows"
  | "wide_multi_trace"
  | "high_invalid_fraction"
  | "invalid_geometry_angles";

export interface CsvParseChallenge {
  readonly code: CsvParseChallengeCode;
  readonly message: string;
}

export interface DetectCsvParseChallengesArgs {
  readonly columns: readonly string[];
  readonly rawData: readonly Record<string, unknown>[];
  readonly mappings: CSVColumnMappings;
  readonly spectrumPointCount: number;
  readonly invalidGeometryMessage?: string | null;
}

const ENERGY_HINT =
  /energy|e\s*v|photon|hv|wavelength/i;
const ABSORPTION_HINT =
  /^(mu|μ|od|abs|absorption|intensity|signal|i0|it|rawabs|mass.?abs|beta|δ|delta)$|absorption|intensity|signal|(^|[^a-z])mu([^a-z]|$)|optical.?density/i;

/**
 * Auto-detects energy / absorption / theta / phi column names from CSV headers.
 */
export function detectSpectrumColumnNames(columns: readonly string[]): {
  energy?: string;
  absorption?: string;
  theta?: string;
  phi?: string;
} {
  const energyCol = columns.find((col) => ENERGY_HINT.test(col));
  const absorptionCol = columns.find((col) => {
    const lower = col.toLowerCase().trim();
    if (lower === "mu" || lower === "μ") return true;
    return (
      lower.includes("absorption") ||
      lower.includes("abs") ||
      lower.includes("intensity") ||
      lower.includes("signal") ||
      ABSORPTION_HINT.test(col)
    );
  });
  const thetaCol = columns.find((col) => col.toLowerCase().includes("theta"));
  const phiCol = columns.find((col) => {
    const lower = col.toLowerCase();
    return lower.includes("phi") || lower.includes("azimuth");
  });
  return {
    energy: energyCol,
    absorption: absorptionCol,
    theta: thetaCol,
    phi: phiCol,
  };
}

function isMostlyNumericColumn(
  rawData: readonly Record<string, unknown>[],
  column: string,
): boolean {
  let finite = 0;
  let seen = 0;
  const sample = rawData.slice(0, Math.min(rawData.length, 40));
  for (const row of sample) {
    const value = row[column];
    if (value === undefined || value === null || value === "") continue;
    seen += 1;
    if (typeof value === "number" && Number.isFinite(value)) {
      finite += 1;
      continue;
    }
    if (typeof value === "string") {
      const n = Number.parseFloat(value.trim());
      if (Number.isFinite(n)) finite += 1;
    }
  }
  return seen > 0 && finite / seen >= 0.8;
}

/**
 * Detects parse/mapping challenges that should open the column-mapping remediation UI.
 */
export function detectCsvParseChallenges(
  args: DetectCsvParseChallengesArgs,
): CsvParseChallenge[] {
  const challenges: CsvParseChallenge[] = [];
  const { columns, rawData, mappings, spectrumPointCount } = args;

  if (columns.length === 0) {
    challenges.push({
      code: "no_columns",
      message:
        "No columns were detected. Try a different header row or delimiter.",
    });
    return challenges;
  }

  if (!mappings.energy) {
    challenges.push({
      code: "missing_energy",
      message:
        "Could not identify an energy column. Map Energy manually or adjust the header row.",
    });
  }

  if (!mappings.absorption) {
    challenges.push({
      code: "missing_absorption",
      message:
        "Could not identify an absorption / mu column. Map Absorption manually.",
    });
  }

  const numericColumns = columns.filter((col) =>
    isMostlyNumericColumn(rawData, col),
  );
  if (
    numericColumns.length >= 6 &&
    (!mappings.absorption ||
      numericColumns.filter((c) => c !== mappings.energy).length >= 5)
  ) {
    challenges.push({
      code: "wide_multi_trace",
      message:
        "This looks like a wide multi-trace table (many numeric columns). Pick the single absorption column for this dataset, or export one geometry per file.",
    });
  }

  if (
    mappings.energy &&
    mappings.absorption &&
    rawData.length > 0 &&
    spectrumPointCount === 0
  ) {
    challenges.push({
      code: "no_numeric_rows",
      message:
        "Mapped columns produced no numeric spectrum rows. Check the data start row or column mapping.",
    });
  }

  if (mappings.energy && mappings.absorption && rawData.length > 0) {
    let invalid = 0;
    let considered = 0;
    for (const row of rawData) {
      const e = row[mappings.energy];
      const a = row[mappings.absorption];
      if (
        (e === undefined || e === null || e === "") &&
        (a === undefined || a === null || a === "")
      ) {
        continue;
      }
      considered += 1;
      const eNum =
        typeof e === "number"
          ? e
          : typeof e === "string"
            ? Number.parseFloat(e)
            : Number.NaN;
      const aNum =
        typeof a === "number"
          ? a
          : typeof a === "string"
            ? Number.parseFloat(a)
            : Number.NaN;
      if (!Number.isFinite(eNum) || !Number.isFinite(aNum)) {
        invalid += 1;
      }
    }
    if (considered >= 10 && invalid / considered > 0.35) {
      challenges.push({
        code: "high_invalid_fraction",
        message: `About ${Math.round((100 * invalid) / considered)}% of rows are non-numeric for the mapped Energy/Absorption columns. Adjust the header or data start row.`,
      });
    }
  }

  if (args.invalidGeometryMessage) {
    challenges.push({
      code: "invalid_geometry_angles",
      message: args.invalidGeometryMessage,
    });
  }

  return challenges;
}

/**
 * Returns true when challenges should block silent ingest and open remediation UI.
 */
export function csvParseNeedsUserHelp(
  challenges: readonly CsvParseChallenge[],
): boolean {
  return challenges.some(
    (c) =>
      c.code === "no_columns" ||
      c.code === "missing_energy" ||
      c.code === "missing_absorption" ||
      c.code === "no_numeric_rows" ||
      c.code === "wide_multi_trace" ||
      c.code === "high_invalid_fraction",
  );
}
