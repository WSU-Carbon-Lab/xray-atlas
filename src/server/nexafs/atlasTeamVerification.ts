import { Prisma } from "~/prisma/client";
import type { ValidationSummary } from "~/server/nexafs/normalizationMetadata";

const ATLAS_TEAM_BYPASS_REASON = "Atlas team verification";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Parses stored `validation_summary` JSON into a {@link ValidationSummary} when the shape matches.
 */
export function parseValidationSummaryJson(
  value: unknown,
): ValidationSummary | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.passed !== "boolean") {
    return null;
  }
  if (value.mode !== "ranges" && value.mode !== "single_point") {
    return null;
  }
  if (!Array.isArray(value.warnings)) {
    return null;
  }
  if (!isRecord(value.checks)) {
    return null;
  }
  if (!isRecord(value.bypass)) {
    return null;
  }
  return value as ValidationSummary;
}

/**
 * Returns whether `validation_summary` marks the dataset as Atlas-team verified.
 */
export function isAtlasTeamVerifiedSummary(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return value.atlasTeamVerified === true;
}

/**
 * Builds a validation summary that records maintainer Atlas-team verification without ingest checks.
 */
export function buildAtlasTeamVerificationSummary(): ValidationSummary {
  return {
    mode: "single_point",
    passed: true,
    warnings: [],
    checks: {
      od: "skip",
      massabsorption: "skip",
      betaCrossCheck: "skip",
    },
    bypass: {
      bypassed: true,
      reason: ATLAS_TEAM_BYPASS_REASON,
    },
    atlasTeamVerified: true,
  };
}

/**
 * Clears Atlas-team verification while preserving an existing ingest validation summary when present.
 */
export function clearAtlasTeamVerificationSummary(
  existing: unknown,
): ValidationSummary | null {
  const parsed = parseValidationSummaryJson(existing);
  if (!parsed) {
    return null;
  }
  if (!parsed.atlasTeamVerified) {
    return parsed;
  }
  const next: ValidationSummary = { ...parsed, atlasTeamVerified: false };
  if (
    next.bypass.reason === ATLAS_TEAM_BYPASS_REASON &&
    next.bypass.bypassed &&
    next.checks.od === "skip" &&
    next.checks.massabsorption === "skip" &&
    next.checks.betaCrossCheck === "skip"
  ) {
    return null;
  }
  return next;
}

/**
 * Serializes a validation summary for Prisma JSON columns.
 */
export function validationSummaryToPrismaJson(
  summary: ValidationSummary | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (summary === null) {
    return Prisma.DbNull;
  }
  return summary as unknown as Prisma.InputJsonValue;
}
