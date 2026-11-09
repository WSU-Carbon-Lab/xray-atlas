/**
 * Normalized channels of a dataset under an optical model's normalization.
 *
 * Applies the model's pre/post windows to the dataset's raw absorption with the same primitives
 * the upload pipeline uses: optical density (zero to one between the windows), mass absorption
 * (bare-atom scaled), and beta (from mass absorption at the beta windows). Nothing is stored. Reads
 * only energy, raw absorption, I0, and geometry columns. Does not choose which model or dataset;
 * callers resolve and authorize first.
 */

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "~/prisma/client";
import type { SpectrumPoint } from "~/components/plots/types";
import type { BareAtomPoint } from "~/features/process-nexafs/types";
import { computeBetaIndex } from "~/features/process-nexafs/utils/betaIndex";
import {
  computeNormalizationForExperiment,
  computeZeroOneNormalization,
  interpolateBareMu,
} from "~/features/process-nexafs/utils/core";
import type { NormalizationSpec } from "~/lib/optical-models/schemas";
import { SPECTRUMPOINTS_SERVER_SCAN_CAP } from "~/server/nexafs/spectrumpointLimits";
import { computeBareAtomAbsorption } from "~/server/utils/cxro";

/** Channel columns aligned by index and sorted by geometry then energy. Missing values are `null`. */
export interface NormalizedChannels {
  energyEv: number[];
  od: (number | null)[];
  massAbsorption: (number | null)[];
  beta: (number | null)[];
  polarizationId: (string | null)[];
  thetaDeg: (number | null)[];
  phiDeg: (number | null)[];
}

type Window = readonly [number, number];
interface ChannelWindows {
  od: { pre: Window; post: Window };
  massabsorption: { pre: Window; post: Window };
  beta: { pre: Window; post: Window };
}

function windowsOf(spec: NormalizationSpec): ChannelWindows {
  if (spec.scope === "unified") {
    const pair = { pre: spec.pre, post: spec.post };
    return { od: pair, massabsorption: pair, beta: pair };
  }
  return { od: spec.od, massabsorption: spec.massabsorption, beta: spec.beta };
}

function sameWindowPair(
  a: ChannelWindows["od"],
  b: ChannelWindows["od"],
): boolean {
  return (
    a.pre[0] === b.pre[0] &&
    a.pre[1] === b.pre[1] &&
    a.post[0] === b.post[0] &&
    a.post[1] === b.post[1]
  );
}

function finiteOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function assertWindowHasPoints(
  energies: readonly number[],
  window: Window,
  label: string,
): void {
  const inside = energies.filter((e) => e >= window[0] && e <= window[1]);
  if (inside.length < 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Normalization window ${label} [${window[0]}, ${window[1]}] eV contains fewer than 2 spectrum points.`,
    });
  }
}

interface Group {
  polarizationId: string | null;
  thetaDeg: number | null;
  phiDeg: number | null;
  points: SpectrumPoint[];
}

/**
 * Normalized channels of one dataset under `normalization`.
 *
 * Each geometry (polarization) is normalized separately. A window that holds fewer than two points
 * of a geometry is rejected. When the molecule has no formula or the bare-atom reference cannot be
 * fetched, `massAbsorption` and `beta` are all `null` and `od` is still computed. Non-finite
 * results become `null`.
 *
 * @param db - Shared Prisma client.
 * @param input - The dataset (experiment) id and the normalization to apply.
 * @returns Columns aligned by index; empty arrays when the dataset has no spectrum points.
 * @throws TRPCError `NOT_FOUND` for an unknown dataset, `BAD_REQUEST` when the dataset has more
 * than the server scan cap of points or a window holds fewer than two points.
 */
export async function computeNormalizedChannels(
  db: PrismaClient,
  input: { experimentId: string; normalization: NormalizationSpec },
): Promise<NormalizedChannels> {
  const experiment = await db.experiments.findUnique({
    where: { id: input.experimentId },
    select: {
      samples: { select: { molecules: { select: { chemicalformula: true } } } },
    },
  });
  if (!experiment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Dataset not found." });
  }
  const formula = experiment.samples.molecules.chemicalformula.trim();

  const count = await db.spectrumpoints.count({
    where: { experimentid: input.experimentId },
  });
  const result: NormalizedChannels = {
    energyEv: [],
    od: [],
    massAbsorption: [],
    beta: [],
    polarizationId: [],
    thetaDeg: [],
    phiDeg: [],
  };
  if (count === 0) return result;
  if (count > SPECTRUMPOINTS_SERVER_SCAN_CAP) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Normalization supports at most ${SPECTRUMPOINTS_SERVER_SCAN_CAP} spectrum points per dataset (${count} present).`,
    });
  }

  const rows = await db.spectrumpoints.findMany({
    where: { experimentid: input.experimentId },
    orderBy: [{ polarizationid: "asc" }, { energyev: "asc" }],
    select: {
      energyev: true,
      rawabs: true,
      i0: true,
      polarizationid: true,
      polarizations: { select: { polardeg: true, azimuthdeg: true } },
    },
  });

  const groups = new Map<string, Group>();
  for (const row of rows) {
    const key = row.polarizationid ?? "";
    let group = groups.get(key);
    if (!group) {
      group = {
        polarizationId: row.polarizationid,
        thetaDeg: row.polarizations ? Number(row.polarizations.polardeg) : null,
        phiDeg: row.polarizations ? Number(row.polarizations.azimuthdeg) : null,
        points: [],
      };
      groups.set(key, group);
    }
    group.points.push({
      energy: row.energyev,
      absorption: row.rawabs,
      ...(row.i0 !== null ? { i0: row.i0 } : {}),
    });
  }

  const windows = windowsOf(input.normalization);
  let barePoints: BareAtomPoint[] = [];
  if (formula.length > 0) {
    try {
      const bareMu = await computeBareAtomAbsorption(formula, { density: 1 });
      barePoints = bareMu
        .map((p) => ({ energy: p.energyEv, absorption: p.mu }))
        .sort((a, b) => a.energy - b.energy);
    } catch {
      barePoints = [];
    }
  }

  for (const group of groups.values()) {
    const energies = group.points.map((p) => p.energy);
    const label = group.polarizationId ?? "default geometry";
    assertWindowHasPoints(energies, windows.od.pre, `od.pre (${label})`);
    assertWindowHasPoints(energies, windows.od.post, `od.post (${label})`);
    const n = group.points.length;
    const nulls = (): (number | null)[] =>
      Array.from({ length: n }, () => null);

    let od = nulls();
    const odResult = computeZeroOneNormalization(
      group.points,
      [...windows.od.pre],
      [...windows.od.post],
    );
    if (odResult && odResult.normalizedPoints.length === n) {
      od = odResult.normalizedPoints.map((p) => finiteOrNull(p.absorption));
    }

    let massAbsorption = nulls();
    let beta = nulls();
    if (barePoints.length > 0) {
      const checked: ChannelWindows["od"][] = [windows.od];
      const checkUnlessRepeated = (
        window: ChannelWindows["od"],
        label: string,
      ): void => {
        if (checked.some((seen) => sameWindowPair(seen, window))) return;
        checked.push(window);
        assertWindowHasPoints(
          energies,
          window.pre,
          `${label}.pre (${group.polarizationId ?? "default geometry"})`,
        );
        assertWindowHasPoints(
          energies,
          window.post,
          `${label}.post (${group.polarizationId ?? "default geometry"})`,
        );
      };
      checkUnlessRepeated(windows.massabsorption, "massabsorption");
      checkUnlessRepeated(windows.beta, "beta");
      const massResult = computeNormalizationForExperiment(
        group.points,
        barePoints,
        [...windows.massabsorption.pre],
        [...windows.massabsorption.post],
      );
      if (massResult && massResult.normalizedPoints.length === n) {
        massAbsorption = massResult.normalizedPoints.map((p) =>
          finiteOrNull(p.absorption),
        );
      }
      const betaBase = sameWindowPair(windows.massabsorption, windows.beta)
        ? massResult
        : computeNormalizationForExperiment(
            group.points,
            barePoints,
            [...windows.beta.pre],
            [...windows.beta.post],
          );
      if (betaBase) {
        const unique = Array.from(new Set(energies)).sort((a, b) => a - b);
        const atomic = unique.map((energy) => ({
          energy,
          absorption: interpolateBareMu(barePoints, energy),
        }));
        const betaPoints = computeBetaIndex(
          betaBase.normalizedPoints,
          energies,
          atomic,
        );
        if (betaPoints.length === n) {
          beta = betaPoints.map((p) => finiteOrNull(p.absorption));
        }
      }
    }

    for (let i = 0; i < n; i += 1) {
      result.energyEv.push(group.points[i]!.energy);
      result.od.push(od[i] ?? null);
      result.massAbsorption.push(massAbsorption[i] ?? null);
      result.beta.push(beta[i] ?? null);
      result.polarizationId.push(group.polarizationId);
      result.thetaDeg.push(group.thetaDeg);
      result.phiDeg.push(group.phiDeg);
    }
  }
  return result;
}
