export function formatNexafsVendorLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function vendorAliasKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,]+/g, " ")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VENDOR_CANONICAL_BY_KEY: Record<string, string> = {
  "sigma adritch": "Sigma-Aldrich",
  "sigma aldrich": "Sigma-Aldrich",
  sigmaaldrich: "Sigma-Aldrich",
  "sigma-aldrich": "Sigma-Aldrich",
  "nano c nanostrcutured carbon": "Nano-C, Inc.",
  "nano c nanostructured carbon": "Nano-C, Inc.",
  "nano c": "Nano-C, Inc.",
  nanoc: "Nano-C, Inc.",
  "nano-c": "Nano-C, Inc.",
  "nano c inc": "Nano-C, Inc.",
  "nano-c inc": "Nano-C, Inc.",
};

export function canonicalizeNexafsVendorName(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = vendorAliasKey(trimmed);
  const mapped = VENDOR_CANONICAL_BY_KEY[key];
  if (mapped) return mapped;
  if (key.includes("sigma") && (key.includes("aldrich") || key.includes("adritch"))) {
    return "Sigma-Aldrich";
  }
  if (/\bnano[\s-]*c\b/.test(key) && key.includes("nanostr")) {
    return "Nano-C, Inc.";
  }
  return trimmed;
}

export function findMatchingVendorId(
  inferredLabel: string,
  vendors: ReadonlyArray<{ id: string; name: string | null | undefined }>,
): string | undefined {
  const trimmed = inferredLabel.trim();
  if (!trimmed || vendors.length === 0) return undefined;
  const canonical = canonicalizeNexafsVendorName(trimmed);
  const labelForKey = canonical || trimmed;
  const targetKey = vendorAliasKey(labelForKey);
  if (!targetKey) return undefined;

  for (const v of vendors) {
    const n = v.name?.trim();
    if (!n) continue;
    const vCanon = canonicalizeNexafsVendorName(n);
    const vLabel = vCanon || n;
    if (vendorAliasKey(vLabel) === targetKey) return v.id;
  }
  return undefined;
}
