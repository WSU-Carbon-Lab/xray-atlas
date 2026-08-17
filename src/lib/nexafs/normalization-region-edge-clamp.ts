/**
 * Clamps pre/post normalization window edge drags so ranges stay ordered and
 * pre does not cross into post (and the reverse).
 */

import type { NormalizationRegionEdgeId } from "~/components/plots/types";

/** Inclusive energy window pair, or null when unset. */
export type NormRegionPair = [number, number] | null;

/** Pre and post contributor normalization windows. */
export interface NormalizationRegionPairState {
  pre: NormRegionPair;
  post: NormRegionPair;
}

const DEFAULT_MIN_SEPARATION_EV = 0.05;

function sortPair(a: number, b: number): [number, number] {
  return a <= b ? [a, b] : [b, a];
}

/**
 * Applies one handle drag to pre/post windows with within-window ordering and
 * a minimum gap between `preMax` and `postMin` when both windows exist.
 *
 * @param regions - Current pre/post windows.
 * @param edge - Which handle moved.
 * @param energy - Proposed energy (eV) for that handle.
 * @param minSeparationEv - Minimum gap between pre max and post min (default 0.05 eV).
 * @returns Updated windows; never inverts a single window or overlaps pre into post.
 */
export function applyNormalizationRegionEdgeChange(
  regions: NormalizationRegionPairState,
  edge: NormalizationRegionEdgeId,
  energy: number,
  minSeparationEv: number = DEFAULT_MIN_SEPARATION_EV,
): NormalizationRegionPairState {
  const sep = Number.isFinite(minSeparationEv)
    ? Math.max(0, minSeparationEv)
    : DEFAULT_MIN_SEPARATION_EV;

  if (edge === "preMin" || edge === "preMax") {
    const cur = regions.pre;
    if (!cur) {
      return { ...regions, pre: sortPair(energy, energy) };
    }
    const lo = Math.min(cur[0], cur[1]);
    const hi = Math.max(cur[0], cur[1]);
    let next = edge === "preMin" ? sortPair(energy, hi) : sortPair(lo, energy);
    const post = regions.post;
    if (post) {
      const postLo = Math.min(post[0], post[1]);
      const maxAllowed = postLo - sep;
      if (next[1] > maxAllowed) {
        const clampedHi = maxAllowed;
        const clampedLo = Math.min(next[0], clampedHi);
        next = sortPair(clampedLo, clampedHi);
      }
    }
    return { ...regions, pre: next };
  }

  const cur = regions.post;
  if (!cur) {
    return { ...regions, post: sortPair(energy, energy) };
  }
  const lo = Math.min(cur[0], cur[1]);
  const hi = Math.max(cur[0], cur[1]);
  let next = edge === "postMin" ? sortPair(energy, hi) : sortPair(lo, energy);
  const pre = regions.pre;
  if (pre) {
    const preHi = Math.max(pre[0], pre[1]);
    const minAllowed = preHi + sep;
    if (next[0] < minAllowed) {
      const clampedLo = minAllowed;
      const clampedHi = Math.max(next[1], clampedLo);
      next = sortPair(clampedLo, clampedHi);
    }
  }
  return { ...regions, post: next };
}
