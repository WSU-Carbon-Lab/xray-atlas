/**
 * Builds the Collaboration comparison from three stored carbon K-edge
 * spectra at 55°. Near-edge samples are resampled onto 283–289 eV. Vacuum
 * contrast uses 271–330 eV. Personal names and
 * role titles are not written into the snapshot.
 */
import type pg from "pg";
import { buildCollaborationTab } from "../../src/features/home/collaboration/collaboration-chart";
import { computeDeltaFromBetaKkcalcStyle } from "../../src/features/kk-calc/compute-delta-from-beta-kkcalc-style";
import { DEFAULT_KK_MASS_DENSITY_G_CM3 } from "../../src/features/kk-calc/default-kk-mass-density";
import type {
  HomeCollaboration,
  HomeCollaborationDataset,
} from "../../src/features/home/snapshot/types";

/** P3HT, Y11, and Y6: carbon K-edge, total electron yield, θ = 55°, φ = 0°. */
const EXPERIMENT_IDS = [
  "775e9e6a-18d1-4a2a-943a-7590e18aeee9",
  "76ba8947-0b5d-4b6f-a68d-9fa0f38d3210",
  "12d5b864-bf0d-423a-9004-82d8cd6e140c",
] as const;

const ANGLE_DEG = 55;
const ENERGY_MIN_EV = 283;
const ENERGY_MAX_EV = 289;
const GRID_COUNT = 81;
const VACUUM_MIN_EV = 271;
const VACUUM_MAX_EV = 330;
const VACUUM_STEP_EV = 0.2;
const W = 720;
const H = 360;
const RAMPS = [0.22, 0.58, 1] as const;

interface PointRow {
  energyev: number;
  od: number | null;
  beta: number | null;
}

interface ExperimentRow {
  id: string;
  slug: string;
  name: string;
  formula: string;
  imageurl: string | null;
}

function interpolate(
  points: readonly { energyev: number; value: number }[],
  energy: number,
): number {
  let lo = 0;
  let hi = points.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.energyev <= energy) lo = mid;
    else hi = mid;
  }
  const left = points[lo]!;
  const right = points[hi]!;
  if (right.energyev === left.energyev) return left.value;
  const span = (energy - left.energyev) / (right.energyev - left.energyev);
  return left.value + span * (right.value - left.value);
}

function roundSample(value: number): number {
  return Number(value.toPrecision(6));
}

/**
 * Kramers-Kronig `δ` on the measured `β` grid at {@link DEFAULT_KK_MASS_DENSITY_G_CM3}.
 * Duplicate energies are averaged. The result is strictly ascending.
 */
function deltaOnMeasuredGrid(
  formula: string,
  points: readonly PointRow[],
): { energyev: number; value: number }[] {
  const buckets = new Map<number, number[]>();
  for (const point of points) {
    if (point.beta == null || !Number.isFinite(point.beta)) continue;
    const key = Number(point.energyev.toFixed(5));
    const list = buckets.get(key) ?? [];
    list.push(point.beta);
    buckets.set(key, list);
  }
  const energyEv = [...buckets.keys()].sort((a, b) => a - b);
  const beta = energyEv.map((energy) => {
    const list = buckets.get(energy) ?? [];
    return list.reduce((sum, value) => sum + value, 0) / list.length;
  });
  if (energyEv.length < 40) {
    throw new Error(`collaboration KK grid for ${formula} is too short`);
  }
  const delta = computeDeltaFromBetaKkcalcStyle({
    energyEv,
    beta,
    stoichiometryFormula: formula,
    densityGPerCm3: DEFAULT_KK_MASS_DENSITY_G_CM3,
  });
  return energyEv.map((energyev, index) => ({
    energyev,
    value: delta[index] ?? Number.NaN,
  }));
}

/**
 * Loads the three collaboration spectra onto the near-edge grid.
 *
 * `client` is the snapshot builder's connected Postgres client. Throws when
 * an experiment, its 55° optical-density trace, or the shared energy window
 * is missing.
 */
export async function buildCollaboration(
  client: pg.Client,
): Promise<HomeCollaboration> {
  const experiments = await client.query<ExperimentRow>(
    `select e.id, s.slug, s.synonym as name, m.chemicalformula as formula,
            m.imageurl
       from experiments e
       join samples sa on sa.id = e.sampleid
       join molecules m on m.id = sa.moleculeid
       join moleculesynonyms s on s.moleculeid = m.id and s."order" = 0
      where e.id = any($1::uuid[])`,
    [EXPERIMENT_IDS],
  );
  const byId = new Map(experiments.rows.map((row) => [row.id, row]));

  const series: { experiment: ExperimentRow; points: PointRow[] }[] = [];
  for (const id of EXPERIMENT_IDS) {
    const experiment = byId.get(id);
    if (!experiment) throw new Error(`collaboration experiment missing: ${id}`);
    const points = await client.query<PointRow>(
      `select sp.energyev::float8 as energyev, sp.od::float8 as od,
              sp.beta::float8 as beta
         from spectrumpoints sp
         join experiments e on e.id = sp.experimentid
         left join polarizations p
           on p.id = coalesce(sp.polarizationid, e.polarizationid)
        where sp.experimentid = $1
          and p.polardeg = $2
          and (sp.od is not null or sp.beta is not null)
        order by sp.energyev`,
      [id, ANGLE_DEG],
    );
    const optical = points.rows.filter(
      (point) => point.od != null && Number.isFinite(point.od),
    );
    if (optical.length < 40) {
      throw new Error(`collaboration spectrum ${id} has too few 55° points`);
    }
    series.push({ experiment, points: points.rows });
  }

  for (const item of series) {
    const optical = item.points.filter((point) => point.od != null);
    const first = optical[0]!.energyev;
    const last = optical[optical.length - 1]!.energyev;
    if (first > VACUUM_MIN_EV || last < VACUUM_MAX_EV) {
      throw new Error(
        `collaboration spectrum ${item.experiment.id} does not cover ${VACUUM_MIN_EV}-${VACUUM_MAX_EV} eV`,
      );
    }
  }

  const vacuumCount =
    Math.round((VACUUM_MAX_EV - VACUUM_MIN_EV) / VACUUM_STEP_EV) + 1;
  const vacuumGrid = Array.from(
    { length: vacuumCount },
    (_, index) =>
      VACUUM_MIN_EV +
      ((VACUUM_MAX_EV - VACUUM_MIN_EV) * index) / (vacuumCount - 1),
  );

  const grid = Array.from(
    { length: GRID_COUNT },
    (_, index) =>
      ENERGY_MIN_EV +
      ((ENERGY_MAX_EV - ENERGY_MIN_EV) * index) / (GRID_COUNT - 1),
  );
  const sampled = series.map((item, index) => {
    const optical = item.points.flatMap((point) =>
      point.od == null ? [] : [{ energyev: point.energyev, value: point.od }],
    );
    const betaPoints = item.points.flatMap((point) =>
      point.beta == null
        ? []
        : [{ energyev: point.energyev, value: point.beta }],
    );
    const deltaPoints = deltaOnMeasuredGrid(
      item.experiment.formula,
      item.points,
    );
    return {
      key: item.experiment.slug,
      label: item.experiment.name,
      ramp: RAMPS[index] ?? 1,
      od: grid.map((energy) => Number(interpolate(optical, energy).toFixed(5))),
      beta: grid.map((energy) => roundSample(interpolate(betaPoints, energy))),
      delta: grid.map((energy) =>
        roundSample(interpolate(deltaPoints, energy)),
      ),
      vacuumBeta: vacuumGrid.map((energy) =>
        roundSample(interpolate(betaPoints, energy)),
      ),
      vacuumDelta: vacuumGrid.map((energy) =>
        roundSample(interpolate(deltaPoints, energy)),
      ),
    };
  });
  const chart = buildCollaborationTab({
    width: W,
    height: H,
    energyMinEv: ENERGY_MIN_EV,
    energyMaxEv: ENERGY_MAX_EV,
    series: sampled,
  });
  if (!chart) throw new Error("collaboration chart has no scale");

  const datasets = series.map((item, index): HomeCollaborationDataset => ({
    experimentId: item.experiment.id,
    slug: item.experiment.slug,
    name: item.experiment.name,
    formula: item.experiment.formula,
    imageUrl: item.experiment.imageurl,
    od: sampled[index]!.od,
    beta: sampled[index]!.beta,
    delta: sampled[index]!.delta,
    vacuumBeta: sampled[index]!.vacuumBeta,
    vacuumDelta: sampled[index]!.vacuumDelta,
  }));
  const [first, second, third] = datasets;
  if (!first || !second || !third) {
    throw new Error("collaboration comparison needs three datasets");
  }

  return {
    energyMinEv: ENERGY_MIN_EV,
    energyMaxEv: ENERGY_MAX_EV,
    vacuumEnergyMinEv: VACUUM_MIN_EV,
    vacuumEnergyMaxEv: VACUUM_MAX_EV,
    datasets: [first, second, third],
    spectrum: {
      moleculeSlug: first.slug,
      experimentId: first.experimentId,
      title: "Carbon K-edge",
      width: W,
      height: H,
      xTicks: chart.xTicks,
      tabs: [chart.tab],
    },
  };
}
