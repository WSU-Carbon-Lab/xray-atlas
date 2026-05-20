export function detectAuxiliarySpectrumColumnNames(columns: string[]): {
  i0?: string;
  od?: string;
  rawabsError?: string;
  odError?: string;
  massabsorption?: string;
  massabsorptionError?: string;
  beta?: string;
  betaError?: string;
  delta?: string;
  deltaError?: string;
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
  const rawabsError = pick(
    (n) =>
      n === "muerr" ||
      n === "muerror" ||
      n === "abserr" ||
      n === "abserror" ||
      n.includes("rawabserr") ||
      n.includes("rawabserror"),
  );
  const odError = pick(
    (n) => n === "oderr" || n === "oderror" || n.includes("opticaldensityerr"),
  );
  const beta = pick((n) => n === "beta");
  const betaError = pick((n) => n === "betaerr" || n === "betaerror");
  const delta = pick(
    (n) =>
      (n === "delta" || n === "kkdelta" || n === "kk_delta") &&
      !n.includes("energy") &&
      !n.includes("err") &&
      !n.includes("error"),
  );
  const deltaError = pick(
    (n) =>
      n === "deltaerr" ||
      n === "deltaerror" ||
      n.includes("deltaerr") ||
      n.includes("deltaerror"),
  );
  const massabsorption = pick(
    (n) =>
      n.includes("massabsorption") ||
      n.includes("mass_absorption") ||
      n === "mu_a" ||
      n === "mua" ||
      n.includes("mac"),
  );
  const massabsorptionError = pick(
    (n) =>
      n.includes("massabsorptionerr") ||
      n.includes("massabsorptionerror") ||
      n.includes("mu_aerr") ||
      n.includes("muaerr"),
  );

  return {
    ...(i0 ? { i0 } : {}),
    ...(od ? { od } : {}),
    ...(rawabsError ? { rawabsError } : {}),
    ...(odError ? { odError } : {}),
    ...(beta ? { beta } : {}),
    ...(betaError ? { betaError } : {}),
    ...(massabsorption ? { massabsorption } : {}),
    ...(massabsorptionError ? { massabsorptionError } : {}),
    ...(delta ? { delta } : {}),
    ...(deltaError ? { deltaError } : {}),
  };
}
