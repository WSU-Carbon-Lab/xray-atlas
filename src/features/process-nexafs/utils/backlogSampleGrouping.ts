import { createHash } from "node:crypto";
import type { ProcessMethod } from "@prisma/client";

export function normalizeBacklogPrepSegment(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function backlogPreparationCanonicalString(args: {
  vendorName: string;
  preparationMethodLabel: string | null | undefined;
  preparationDetails: string | null | undefined;
  processMethod: ProcessMethod;
  substrate: string | null;
}) {
  const vendor = normalizeBacklogPrepSegment(args.vendorName);
  const method = normalizeBacklogPrepSegment(args.preparationMethodLabel);
  const details = normalizeBacklogPrepSegment(args.preparationDetails);
  const sub = normalizeBacklogPrepSegment(args.substrate ?? "");
  return [vendor, method, details, sub, args.processMethod].join("\t");
}

export function backlogPreparationSlugFromCanonical(canonical: string) {
  return createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 16);
}

export function formatBacklogSampleIdentifier(
  moleculeId: string,
  preparationSlug: string,
) {
  const tail = sanitizeBacklogSampleIdentifierPart(`backlog-prep-${preparationSlug}`);
  return sanitizeBacklogSampleIdentifierPart(
    ["SAMPLE", moleculeId, tail].join("-"),
  );
}

export function sanitizeBacklogSampleIdentifierPart(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 220);
}

const LEGACY_SLUG_DEFAULT = "legacy-backlog-default";
const LEGACY_SLUG_NSLS2_SK = "legacy-backlog-nsls2-sk";

export function backlogPreparationSlugFromSampleIdentifier(identifier: string) {
  const suffRe = /-backlog-prep-(.+)$/;
  const suff = suffRe.exec(identifier);
  if (suff?.[1]) {
    const s = suff[1];
    if (/^[a-f0-9]{16}$/.test(s)) return s;
    if (s === LEGACY_SLUG_DEFAULT || s === LEGACY_SLUG_NSLS2_SK) return s;
  }
  if (identifier.endsWith("-backlog-default")) return LEGACY_SLUG_DEFAULT;
  if (identifier.endsWith("-backlog-nsls2-sulfur-k")) return LEGACY_SLUG_NSLS2_SK;
  return null;
}

export function backlogPreparationSlugForSampleRow(
  identifier: string,
  preparationfingerprint: string | null,
) {
  const fromId = backlogPreparationSlugFromSampleIdentifier(identifier);
  if (fromId) return fromId;
  if (preparationfingerprint) {
    return backlogPreparationSlugFromCanonical(preparationfingerprint);
  }
  throw new Error(
    `Sample ${identifier} has no recognizable backlog identifier and no preparation fingerprint`,
  );
}
