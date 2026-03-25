export function detectAuxiliarySpectrumColumnNames(columns: string[]): {
  i0?: string;
  od?: string;
  massabsorption?: string;
  beta?: string;
} {
  const norm = (raw: string) =>
    raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[\[\]]/g, "");

  const used = new Set<string>();
  const pick = (matches: (n: string) => boolean): string | undefined => {
    for (const raw of columns) {
      if (used.has(raw)) continue;
      const n = norm(raw);
      if (!n) continue;
      if (matches(n)) {
        used.add(raw);
        return raw;
      }
    }
    return undefined;
  };

  const i0 = pick((n) => n === "i0" || n === "i_0");
  const od = pick((n) => n === "od" || n.includes("opticaldensity"));
  const beta = pick((n) => n === "beta");
  const massabsorption = pick(
    (n) =>
      n.includes("massabsorption") ||
      n.includes("mass_absorption") ||
      n === "mu_a" ||
      n === "mua" ||
      n.includes("mac"),
  );

  return {
    ...(i0 ? { i0 } : {}),
    ...(od ? { od } : {}),
    ...(beta ? { beta } : {}),
    ...(massabsorption ? { massabsorption } : {}),
  };
}
