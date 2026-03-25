const COLLINS_GROUP_COLLECTOR_USER_IDS = [
  "05f4c269-2d65-41f1-a8e1-db19fbb87e4b",
  "26387067-f1bc-4a2e-92c8-c475d0112095",
  "438a9ce0-cd5c-41b2-951d-33252a4a164b",
] as const;

function normalizeGroupToken(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function collectorUserIdsForResearchGroupToken(
  token: string | null | undefined,
): string[] {
  if (!token) return [];
  if (normalizeGroupToken(token) === "collins") {
    return [...COLLINS_GROUP_COLLECTOR_USER_IDS];
  }
  return [];
}

export function mergeUniqueCollectorUserIds(
  ...lists: Array<string[] | undefined>
): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const id of list ?? []) {
      if (typeof id === "string" && id.length > 0) out.add(id);
    }
  }
  return [...out];
}
