import { henkeCompositionTabulatedSpan } from "./kkcalc-henke-f2";
import type { StoichiometryTerm } from "./kkcalc-stoichiometry";

/**
 * Maps contributor pre-edge and post-edge normalization windows to the inclusive Henke merge
 * interval used by {@link extendImaginaryAsfWithHenkeTails}: low bound is the lower end of the pre
 * window (clamped to tabulated Henke coverage) and high bound is the upper end of the post window
 * (same clamp). When unset or degenerate after clamping, callers should omit `mergeDomain` and use
 * the default full-measurement span inside the extension helper.
 *
 * @param args.pre Finite pre-edge `[eV, eV]` pair (order-independent).
 * @param args.post Finite post-edge `[eV, eV]` pair (order-independent).
 * @param args.composition Parsed stoichiometry for Henke tabulated intersection limits.
 * @returns A strictly increasing `[lo, hi]` inside Henke coverage, or `undefined` if inputs are invalid.
 */
export function resolveHenkeKkMergeDomainFromPrePostWindows(args: {
  readonly pre: readonly [number, number];
  readonly post: readonly [number, number];
  readonly composition: readonly StoichiometryTerm[];
}): readonly [number, number] | undefined {
  const span = henkeCompositionTabulatedSpan(args.composition);
  const preLo = Math.min(args.pre[0], args.pre[1]);
  const postHi = Math.max(args.post[0], args.post[1]);
  let lo = Math.max(preLo, span.minEv);
  let hi = Math.min(postHi, span.maxEv);
  if (!(hi > lo)) {
    return undefined;
  }
  return [lo, hi];
}
