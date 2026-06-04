import type { SpectrumPoint } from "~/components/plots/types";
import {
  BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS,
  buildBareAtomRepresentationMatrix,
  type BareAtomRepresentationMatrix,
} from "~/features/process-nexafs/bare-atom-representation-matrix";
import {
  buildPlotPointsForChannel,
  type NexafsPlotChannelId,
} from "~/features/process-nexafs/nexafs-plot-channels";

const EXPORT_DERIVED_CHANNEL_IDS = [
  "f2",
  "f1",
  "im-epsilon",
  "re-epsilon",
  "im-chi",
  "re-chi",
] as const satisfies readonly NexafsPlotChannelId[];

const DERIVED_CHANNEL_CSV_HEADERS: Record<
  (typeof EXPORT_DERIVED_CHANNEL_IDS)[number],
  string
> = {
  f2: "f2",
  f1: "f1",
  "im-epsilon": "im_epsilon",
  "re-epsilon": "re_epsilon",
  "im-chi": "im_chi",
  "re-chi": "re_chi",
};

const BARE_ATOM_CHANNEL_CSV_HEADERS: Record<
  (typeof BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS)[number],
  string
> = {
  "mass-absorption": "bare_atom_mu",
  beta: "bare_atom_beta",
  f2: "bare_atom_f2",
  "im-epsilon": "bare_atom_im_epsilon",
  "im-chi": "bare_atom_im_chi",
  delta: "bare_atom_delta",
  f1: "bare_atom_f1",
  "re-epsilon": "bare_atom_re_epsilon",
  "re-chi": "bare_atom_re_chi",
};

export type NexafsSpectrumCsvExportOptions = {
  readonly stoichiometryFormula?: string | null;
  readonly includeBareAtom?: boolean;
};

export type NexafsSpectrumExportBuildResult = {
  readonly csv: string;
  readonly rowCount: number;
  readonly omittedDerivedColumns: boolean;
  readonly omittedBareAtomColumns: boolean;
};

function escapeCsvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function fmtOpt(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

function strictlyAscendingUniqueEnergies(
  spectrumPoints: readonly SpectrumPoint[],
): number[] {
  const seen = new Set<number>();
  const energies: number[] = [];
  for (const p of spectrumPoints) {
    if (!Number.isFinite(p.energy) || seen.has(p.energy)) {
      continue;
    }
    seen.add(p.energy);
    energies.push(p.energy);
  }
  energies.sort((a, b) => a - b);
  return energies;
}

function channelValuesByEnergy(
  points: readonly SpectrumPoint[],
): Map<number, number> {
  const map = new Map<number, number>();
  for (const p of points) {
    if (Number.isFinite(p.energy) && Number.isFinite(p.absorption)) {
      map.set(p.energy, p.absorption);
    }
  }
  return map;
}

function bareAtomChannelMaps(
  matrix: BareAtomRepresentationMatrix,
): Partial<
  Record<(typeof BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS)[number], Map<number, number>>
> {
  const out: Partial<
    Record<
      (typeof BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS)[number],
      Map<number, number>
    >
  > = {};
  for (const channelId of BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS) {
    const pts = matrix.channels[channelId];
    if (pts && pts.length > 0) {
      out[channelId] = channelValuesByEnergy(
        pts.map((p) => ({ energy: p.energy, absorption: p.absorption })),
      );
    }
  }
  return out;
}

function derivedChannelMaps(
  points: readonly SpectrumPoint[],
  formula: string,
): Partial<
  Record<(typeof EXPORT_DERIVED_CHANNEL_IDS)[number], Map<number, number>>
> {
  const out: Partial<
    Record<(typeof EXPORT_DERIVED_CHANNEL_IDS)[number], Map<number, number>>
  > = {};
  for (const channelId of EXPORT_DERIVED_CHANNEL_IDS) {
    const plotted = buildPlotPointsForChannel(channelId, points, formula);
    if (plotted.length > 0) {
      out[channelId] = channelValuesByEnergy(plotted);
    }
  }
  return out;
}

function lookupCsv(
  map: Map<number, number> | undefined,
  energy: number,
): string {
  if (!map) {
    return "";
  }
  return fmtOpt(map.get(energy));
}

/**
 * Builds a CSV document for one geometry slice or merged experiment points, including persisted
 * spectrumpoint columns plus plot-derived f/ε/χ and Henke/CXRO bare-atom references on the same
 * energy grid (1 g/cm³ stoichiometry for f factors, matching browse plots).
 *
 * @param points Spectrum rows in export order (callers usually sort by energy).
 * @param options Optional stoichiometry for derived and bare-atom columns; omit both when unknown.
 * @returns CSV text, row count, and flags when formula-dependent columns were skipped.
 */
export async function buildNexafsSpectrumExportCsv(
  points: SpectrumPoint[],
  options: NexafsSpectrumCsvExportOptions = {},
): Promise<NexafsSpectrumExportBuildResult> {
  if (points.length === 0) {
    return {
      csv: "",
      rowCount: 0,
      omittedDerivedColumns: true,
      omittedBareAtomColumns: true,
    };
  }

  const formula = options.stoichiometryFormula?.trim() ?? "";
  const hasRawabs = points.some(
    (p) => typeof p.rawabs === "number" && Number.isFinite(p.rawabs),
  );
  const hasDelta = points.some(
    (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
  );

  const derivedMaps = formula ? derivedChannelMaps(points, formula) : {};
  const omittedDerivedColumns = !formula || EXPORT_DERIVED_CHANNEL_IDS.every(
    (id) => !derivedMaps[id]?.size,
  );

  let bareAtomMaps: ReturnType<typeof bareAtomChannelMaps> = {};
  let omittedBareAtomColumns = true;
  if (
    options.includeBareAtom !== false &&
    formula &&
    points.length >= 2
  ) {
    const targetEnergyEv = strictlyAscendingUniqueEnergies(points);
    if (targetEnergyEv.length >= 2) {
      try {
        const matrix = await buildBareAtomRepresentationMatrix(
          formula,
          targetEnergyEv,
        );
        if (matrix) {
          bareAtomMaps = bareAtomChannelMaps(matrix);
          omittedBareAtomColumns = BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS.every(
            (id) => !bareAtomMaps[id]?.size,
          );
        }
      } catch (error) {
        console.warn(
          "[buildNexafsSpectrumExportCsv] Skipping bare-atom columns:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  const bareAtomChannelIds = omittedBareAtomColumns
    ? ([] as const)
    : BARE_ATOM_OVERLAY_MATRIX_CHANNEL_IDS;

  const baseHeaders = [
    "energy_eV",
    ...(hasRawabs ? (["rawabs"] as const) : []),
    "mu",
    "od",
    "mass_absorption",
    "beta",
    ...(hasDelta ? (["delta"] as const) : []),
    ...EXPORT_DERIVED_CHANNEL_IDS.map((id) => DERIVED_CHANNEL_CSV_HEADERS[id]),
    ...bareAtomChannelIds.map((id) => BARE_ATOM_CHANNEL_CSV_HEADERS[id]),
    "i0",
    "theta_deg",
    "phi_deg",
  ];

  const lines = points.map((p) => {
    const energy = p.energy;
    const cells = [
      p.energy.toFixed(6),
      ...(hasRawabs ? [fmtOpt(p.rawabs)] : []),
      p.absorption.toExponential(8),
      fmtOpt(p.od),
      fmtOpt(p.massabsorption),
      fmtOpt(p.beta),
      ...(hasDelta ? [fmtOpt(p.delta)] : []),
      ...EXPORT_DERIVED_CHANNEL_IDS.map((id) =>
        lookupCsv(derivedMaps[id], energy),
      ),
      ...bareAtomChannelIds.map((id) => lookupCsv(bareAtomMaps[id], energy)),
      fmtOpt(p.i0),
      fmtOpt(p.theta),
      fmtOpt(p.phi),
    ];
    return cells.map(escapeCsvCell).join(",");
  });

  const csv = [baseHeaders.join(","), ...lines].join("\n");
  return {
    csv,
    rowCount: points.length,
    omittedDerivedColumns,
    omittedBareAtomColumns,
  };
}

/**
 * @deprecated Prefer {@link buildNexafsSpectrumExportCsv} for full channel export. Retained for
 * callers that only need persisted columns without async bare-atom fetches.
 */
export function spectrumPointsToDetailedCsv(points: SpectrumPoint[]): string {
  if (points.length === 0) {
    return "";
  }
  const hasDelta = points.some(
    (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
  );
  const header = hasDelta
    ? "energy_eV,mu,od,mass_absorption,beta,delta,i0,theta_deg,phi_deg"
    : "energy_eV,mu,od,mass_absorption,beta,i0,theta_deg,phi_deg";
  const lines = points.map((p) =>
    [
      p.energy.toFixed(6),
      p.absorption.toExponential(8),
      fmtOpt(p.od),
      fmtOpt(p.massabsorption),
      fmtOpt(p.beta),
      ...(hasDelta ? [fmtOpt(p.delta)] : []),
      fmtOpt(p.i0),
      fmtOpt(p.theta),
      fmtOpt(p.phi),
    ]
      .map(escapeCsvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
