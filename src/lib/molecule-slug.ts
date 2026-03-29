export type MoleculeSlugSource = {
  name?: string | null;
  commonName?: string[] | null;
  iupacName?: string | null;
};

export function slugifyMoleculeSynonym(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.length > 0 ? base : "molecule";
}

export function canonicalMoleculeSlugFromView(m: MoleculeSlugSource): string {
  const candidates = [
    m.name,
    m.commonName?.find((s) => s.trim().length > 0),
    m.iupacName,
  ];
  const first = candidates
    .map((s) => s?.trim() ?? "")
    .find((s) => s.length > 0);
  return slugifyMoleculeSynonym(first ?? "molecule");
}

