/**
 * Discrete Kramers–Kronig quadrature on a finite photon-energy grid.
 *
 * This module implements a **symmetric principal-value sum** that relates a real-part
 * proxy (reported here as `delta`) to the imaginary optical constant `beta` on the same
 * tabulated energies. It is informed by the same ordering conventions as kkcalc’s
 * tabulated output (energy ascending; real part paired with imaginary part on identical
 * abscissae) but it is **not** a port of kkcalc’s full piecewise-polynomial `KK_PP`
 * pipeline, which merges tabulated atomic scattering data outside the measurement window.
 */

const TWO_OVER_PI = 2 / Math.PI;

/**
 * Computes `delta` samples from strictly ascending photon energies and aligned `beta`
 * using a discrete Kramers–Kronig-style kernel on the measurement grid only.
 *
 * @param energyEvAsc Strictly ascending photon energies in electron-volts; duplicate
 *   energies are rejected. Callers must sort each polarization trace before invoking.
 * @param beta Imaginary optical constant aligned with `energyEvAsc` (same convention as
 *   {@link computeBetaIndex} in `process-nexafs`: proportional to imaginary refractive
 *   index derived from absorption-like mu on the same grid).
 * @returns One `delta` value per input row, in the same units as `beta` up to an additive
 *   offset fixed by anchoring the high-energy tail median to zero.
 * @throws RangeError When lengths differ, fewer than four samples are provided, energies
 *   are not strictly increasing, or any `beta` entry is not finite.
 */
export function computeDeltaFromBetaDiscreteKK(
  energyEvAsc: ReadonlyArray<number>,
  beta: ReadonlyArray<number>,
): number[] {
  if (energyEvAsc.length !== beta.length) {
    throw new RangeError("energyEvAsc and beta must have the same length");
  }
  const n = energyEvAsc.length;
  if (n < 4) {
    throw new RangeError(
      "At least four samples are required for discrete Kramers-Kronig quadrature",
    );
  }
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(energyEvAsc[i]!) || !Number.isFinite(beta[i]!)) {
      throw new RangeError("energyEvAsc and beta must contain only finite numbers");
    }
  }
  for (let i = 1; i < n; i++) {
    if (energyEvAsc[i]! <= energyEvAsc[i - 1]!) {
      throw new RangeError(
        "energyEvAsc must be strictly ascending with unique energies for each sample",
      );
    }
  }

  const raw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const Ei = energyEvAsc[i]!;
    const bi = beta[i]!;
    let acc = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const Ej = energyEvAsc[j]!;
      const bj = beta[j]!;
      const num = Ej * bj - Ei * bi;
      const den = Ej * Ej - Ei * Ei;
      acc += (TWO_OVER_PI * num) / den;
    }
    raw[i] = acc;
  }

  const anchorStart = Math.floor(n * 0.9);
  const tailCount = Math.max(1, n - anchorStart);
  let tailMean = 0;
  for (let k = anchorStart; k < n; k++) {
    tailMean += raw[k]!;
  }
  tailMean /= tailCount;

  return Array.from(raw, (v) => v - tailMean);
}
