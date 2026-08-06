/**
 * Client- and server-safe guards for duplicate photon energies within one
 * polarization geometry before `spectrumpoints` persistence.
 */

/** Minimal energy-keyed row used for uniqueness checks before `createMany`. */
export interface SpectrumEnergyKeyedPoint {
  energy: number;
  absorption: number;
  i0?: number;
  od?: number;
  rawabsError?: number;
  odError?: number;
  massabsorption?: number;
  massabsorptionError?: number;
  beta?: number;
  betaError?: number;
  delta?: number;
  deltaError?: number;
  theta?: number;
  phi?: number;
}

/** Geometry label used in user-facing duplicate-energy error copy. */
export interface SpectrumGeometryLabel {
  theta: number;
  phi: number;
}

/** One row participating in a conflicting duplicate-energy cluster. */
export interface SpectrumEnergyConflictRow {
  /** Index in the contributor's in-memory `spectrumPoints` array. */
  pointIndex: number;
  absorption: number;
  od?: number;
  massabsorption?: number;
  beta?: number;
}

/** Conflicting rows that share one geometry and photon energy. */
export interface SpectrumEnergyConflictGroup {
  theta: number;
  phi: number;
  energy: number;
  rows: SpectrumEnergyConflictRow[];
}

/** Keeps one existing row or synthesizes one averaged row for a conflict group. */
export type SpectrumEnergyConflictResolutionChoice =
  | {
      kind: "keep-row";
      pointIndex: number;
    }
  | {
      kind: "average";
    };

/** Result when every duplicate-energy cluster is value-identical and collapsed. */
export interface SpectrumEnergyUniquenessOk<T extends SpectrumEnergyKeyedPoint> {
  ok: true;
  /** Points after collapsing identical duplicate energies; last row wins. */
  points: T[];
  /** Energies that appeared more than once and were collapsed. */
  collapsedEnergies: number[];
}

/** Result when the same energy carries conflicting channel values. */
export interface SpectrumEnergyUniquenessConflict {
  ok: false;
  /** Distinct energies that have at least two non-equal rows. */
  conflictingEnergies: number[];
}

export type SpectrumEnergyUniquenessResult<T extends SpectrumEnergyKeyedPoint> =
  | SpectrumEnergyUniquenessOk<T>
  | SpectrumEnergyUniquenessConflict;

/** Outcome of upload preflight across all polarization groups. */
export type SpectrumEnergyUploadPreflightResult<
  T extends SpectrumEnergyKeyedPoint,
> =
  | { ok: true; points: T[]; collapsedCount: number }
  | { ok: false; conflicts: SpectrumEnergyConflictGroup[] };

const CHANNEL_KEYS = [
  "absorption",
  "i0",
  "od",
  "rawabsError",
  "odError",
  "massabsorption",
  "massabsorptionError",
  "beta",
  "betaError",
  "delta",
  "deltaError",
] as const satisfies ReadonlyArray<keyof SpectrumEnergyKeyedPoint>;

function optionalNumberEqual(
  a: number | undefined,
  b: number | undefined,
): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return Object.is(a, b);
}

function averageFiniteValues(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

/**
 * Builds the stable lookup key for one geometry plus energy conflict group.
 *
 * @param theta Polar angle in degrees for the polarization group.
 * @param phi Azimuthal angle in degrees for the polarization group.
 * @param energy Photon energy in eV shared by conflicting rows.
 */
export function spectrumEnergyConflictGroupKey(
  theta: number,
  phi: number,
  energy: number,
): string {
  return `${theta}:${phi}:${energy}`;
}

function geometryKeyFromPoint(point: SpectrumEnergyKeyedPoint): string | null {
  if (
    typeof point.theta !== "number" ||
    !Number.isFinite(point.theta) ||
    typeof point.phi !== "number" ||
    !Number.isFinite(point.phi)
  ) {
    return null;
  }
  return `${point.theta}:${point.phi}`;
}

function parseGeometryKey(key: string): SpectrumGeometryLabel {
  const [thetaRaw, phiRaw] = key.split(":");
  return {
    theta: Number(thetaRaw),
    phi: Number(phiRaw),
  };
}

function groupPointIndicesByGeometry(
  points: readonly SpectrumEnergyKeyedPoint[],
): Map<string, number[]> {
  const grouped = new Map<string, number[]>();
  for (let index = 0; index < points.length; index++) {
    const geometryKey = geometryKeyFromPoint(points[index]!);
    if (!geometryKey) continue;
    const list = grouped.get(geometryKey);
    if (list) {
      list.push(index);
    } else {
      grouped.set(geometryKey, [index]);
    }
  }
  return grouped;
}

function conflictRowFromPoint(
  pointIndex: number,
  point: SpectrumEnergyKeyedPoint,
): SpectrumEnergyConflictRow {
  return {
    pointIndex,
    absorption: point.absorption,
    od: point.od,
    massabsorption: point.massabsorption,
    beta: point.beta,
  };
}

/**
 * Reports whether two spectrum rows carry the same persisted channel values at
 * one energy. Geometry fields (`theta`, `phi`) are ignored because callers
 * already scoped rows to one polarization group.
 */
export function spectrumPointChannelsEqual(
  a: SpectrumEnergyKeyedPoint,
  b: SpectrumEnergyKeyedPoint,
): boolean {
  for (const key of CHANNEL_KEYS) {
    if (!optionalNumberEqual(a[key], b[key])) {
      return false;
    }
  }
  return true;
}

/**
 * Synthesizes one averaged spectrum row for a duplicate-energy conflict group.
 *
 * Preserves the conflict identity fields (`energy`, `theta`, `phi`) from the
 * first row in `rows`, then averages each numeric channel across only the rows
 * where that channel is finite. Non-channel fields from `T` remain copied from
 * the first row so callers keep a stable representative shape.
 *
 * @param rows Conflicting rows scoped to one energy and one polarization.
 * @returns One merged row, or `null` when no rows were provided.
 */
export function averageSpectrumEnergyConflictRows<
  T extends SpectrumEnergyKeyedPoint,
>(rows: readonly T[]): T | null {
  const base = rows[0];
  if (!base) {
    return null;
  }

  const averaged = { ...base };
  for (const key of CHANNEL_KEYS) {
    const values = rows.flatMap((row) => {
      const value = row[key];
      return typeof value === "number" && Number.isFinite(value) ? [value] : [];
    });
    const average = averageFiniteValues(values);
    if (average === undefined) {
      delete averaged[key];
    } else {
      averaged[key] = average;
    }
  }
  return averaged;
}

/**
 * Resolves duplicate `energy` values within one polarization geometry group
 * before `spectrumpoints.createMany`.
 *
 * For each energy that appears more than once: if every row is channel-equal,
 * keeps the **last** occurrence (stable last-wins). If any channel differs,
 * returns a conflict listing those energies so the router can raise
 * `BAD_REQUEST` instead of a Prisma unique-constraint error.
 *
 * @param points Spectrum rows already scoped to one theta/phi group.
 * @returns Deduped points when safe to insert, or conflicting energies.
 */
export function prepareSpectrumPointsForUniqueEnergyInsert<
  T extends SpectrumEnergyKeyedPoint,
>(points: readonly T[]): SpectrumEnergyUniquenessResult<T> {
  if (points.length <= 1) {
    return { ok: true, points: [...points], collapsedEnergies: [] };
  }

  const indicesByEnergy = new Map<number, number[]>();
  for (let i = 0; i < points.length; i++) {
    const energy = points[i]!.energy;
    const list = indicesByEnergy.get(energy);
    if (list) {
      list.push(i);
    } else {
      indicesByEnergy.set(energy, [i]);
    }
  }

  const conflictingEnergies: number[] = [];
  const collapsedEnergies: number[] = [];
  const drop = new Set<number>();

  for (const [energy, indices] of indicesByEnergy) {
    if (indices.length < 2) continue;

    const first = points[indices[0]!]!;
    let allEqual = true;
    for (let k = 1; k < indices.length; k++) {
      if (!spectrumPointChannelsEqual(first, points[indices[k]!]!)) {
        allEqual = false;
        break;
      }
    }

    if (!allEqual) {
      conflictingEnergies.push(energy);
      continue;
    }

    collapsedEnergies.push(energy);
    for (let k = 0; k < indices.length - 1; k++) {
      drop.add(indices[k]!);
    }
  }

  if (conflictingEnergies.length > 0) {
    conflictingEnergies.sort((a, b) => a - b);
    return { ok: false, conflictingEnergies };
  }

  if (drop.size === 0) {
    return { ok: true, points: [...points], collapsedEnergies: [] };
  }

  collapsedEnergies.sort((a, b) => a - b);
  const deduped: T[] = [];
  for (let i = 0; i < points.length; i++) {
    if (!drop.has(i)) {
      deduped.push(points[i]!);
    }
  }
  return { ok: true, points: deduped, collapsedEnergies };
}

/**
 * Lists every geometry/energy cluster where duplicate rows disagree on channel
 * values. Identical duplicate rows are not returned because they can be
 * collapsed automatically.
 *
 * @param points Full upload spectrum array spanning one or more geometries.
 */
export function detectSpectrumEnergyConflictGroups<
  T extends SpectrumEnergyKeyedPoint,
>(points: readonly T[]): SpectrumEnergyConflictGroup[] {
  const conflicts: SpectrumEnergyConflictGroup[] = [];
  const grouped = groupPointIndicesByGeometry(points);

  for (const [geometryKey, indices] of grouped) {
    const { theta, phi } = parseGeometryKey(geometryKey);
    const indicesByEnergy = new Map<number, number[]>();

    for (const index of indices) {
      const energy = points[index]!.energy;
      const list = indicesByEnergy.get(energy);
      if (list) {
        list.push(index);
      } else {
        indicesByEnergy.set(energy, [index]);
      }
    }

    for (const [energy, energyIndices] of indicesByEnergy) {
      if (energyIndices.length < 2) continue;

      const first = points[energyIndices[0]!]!;
      let allEqual = true;
      for (let k = 1; k < energyIndices.length; k++) {
        if (!spectrumPointChannelsEqual(first, points[energyIndices[k]!]!)) {
          allEqual = false;
          break;
        }
      }

      if (!allEqual) {
        conflicts.push({
          theta,
          phi,
          energy,
          rows: energyIndices.map((pointIndex) =>
            conflictRowFromPoint(pointIndex, points[pointIndex]!),
          ),
        });
      }
    }
  }

  conflicts.sort((a, b) => {
    if (a.theta !== b.theta) return a.theta - b.theta;
    if (a.phi !== b.phi) return a.phi - b.phi;
    return a.energy - b.energy;
  });

  return conflicts;
}

/**
 * Returns whether any polarization geometry still has conflicting duplicate
 * photon energies in the upload array.
 *
 * @param points Contributor upload spectrum rows.
 */
export function hasSpectrumEnergyConflicts(
  points: readonly SpectrumEnergyKeyedPoint[],
): boolean {
  return detectSpectrumEnergyConflictGroups(points).length > 0;
}

/**
 * Preflights an upload spectrum array: auto-collapses identical duplicate
 * energies per geometry and reports unresolved value conflicts.
 *
 * @param points Contributor upload spectrum rows with theta/phi on each row.
 */
export function preflightSpectrumPointsEnergyUniqueness<
  T extends SpectrumEnergyKeyedPoint,
>(points: readonly T[]): SpectrumEnergyUploadPreflightResult<T> {
  const conflicts = detectSpectrumEnergyConflictGroups(points);
  if (conflicts.length > 0) {
    return { ok: false, conflicts };
  }

  const drop = new Set<number>();
  let collapsedCount = 0;
  const grouped = groupPointIndicesByGeometry(points);

  for (const indices of grouped.values()) {
    const slice = indices.map((index) => points[index]!);
    const uniqueness = prepareSpectrumPointsForUniqueEnergyInsert(slice);
    if (!uniqueness.ok) {
      return { ok: false, conflicts: detectSpectrumEnergyConflictGroups(points) };
    }

    collapsedCount += uniqueness.collapsedEnergies.length;
    if (uniqueness.collapsedEnergies.length === 0) continue;

    const keptLocal = new Map<number, number>();
    for (const energy of uniqueness.collapsedEnergies) {
      let lastLocalIndex = -1;
      for (let localIndex = 0; localIndex < slice.length; localIndex++) {
        if (slice[localIndex]!.energy === energy) {
          lastLocalIndex = localIndex;
        }
      }
      if (lastLocalIndex >= 0) {
        keptLocal.set(energy, lastLocalIndex);
      }
    }

    const indicesByEnergy = new Map<number, number[]>();
    for (let localIndex = 0; localIndex < slice.length; localIndex++) {
      const energy = slice[localIndex]!.energy;
      const list = indicesByEnergy.get(energy);
      if (list) {
        list.push(localIndex);
      } else {
        indicesByEnergy.set(energy, [localIndex]);
      }
    }

    for (const [energy, localIndices] of indicesByEnergy) {
      if (localIndices.length < 2) continue;
      const keepLocal = keptLocal.get(energy);
      if (keepLocal === undefined) continue;
      for (const localIndex of localIndices) {
        if (localIndex !== keepLocal) {
          drop.add(indices[localIndex]!);
        }
      }
    }
  }

  if (drop.size === 0) {
    return { ok: true, points: [...points], collapsedCount };
  }

  const deduped: T[] = [];
  for (let index = 0; index < points.length; index++) {
    if (!drop.has(index)) {
      deduped.push(points[index]!);
    }
  }

  return { ok: true, points: deduped, collapsedCount };
}

/**
 * Applies contributor conflict resolutions by keeping one row per conflicting
 * geometry/energy group, then auto-collapses any remaining identical duplicates.
 *
 * @param points Full upload spectrum array before resolution.
 * @param resolutionByGroupKey Map from {@link spectrumEnergyConflictGroupKey}
 * to either one kept `spectrumPoints` index or an averaged-row instruction.
 */
export function applySpectrumEnergyConflictResolution<
  T extends SpectrumEnergyKeyedPoint,
>(
  points: readonly T[],
  resolutionByGroupKey: ReadonlyMap<
    string,
    SpectrumEnergyConflictResolutionChoice
  >,
): T[] {
  const drop = new Set<number>();
  const replacements = new Map<number, T>();
  const conflicts = detectSpectrumEnergyConflictGroups(points);

  for (const group of conflicts) {
    const key = spectrumEnergyConflictGroupKey(
      group.theta,
      group.phi,
      group.energy,
    );
    const resolution = resolutionByGroupKey.get(key);
    if (!resolution) continue;

    if (resolution.kind === "average") {
      const rows = group.rows
        .map((row) => points[row.pointIndex])
        .filter((row): row is T => row !== undefined);
      const averaged = averageSpectrumEnergyConflictRows(rows);
      if (!averaged) continue;
      const keepIndex = group.rows[0]?.pointIndex;
      if (keepIndex === undefined) continue;
      replacements.set(keepIndex, averaged);
      for (const row of group.rows.slice(1)) {
        drop.add(row.pointIndex);
      }
      continue;
    }

    for (const row of group.rows) {
      if (row.pointIndex !== resolution.pointIndex) {
        drop.add(row.pointIndex);
      }
    }
  }

  const filtered: T[] = [];
  for (let index = 0; index < points.length; index++) {
    if (drop.has(index)) {
      continue;
    }
    filtered.push(replacements.get(index) ?? points[index]!);
  }

  const preflight = preflightSpectrumPointsEnergyUniqueness(filtered);
  return preflight.ok ? preflight.points : filtered;
}

const MAX_LISTED_ENERGIES = 8;

/**
 * Builds a contributor-facing message for conflicting duplicate energies at one
 * polarization geometry. Lists up to eight energies (eV), then a remainder count.
 *
 * @param geometry Theta/phi for the polarization group that failed.
 * @param conflictingEnergies Distinct photon energies with non-equal duplicate rows.
 */
export function formatConflictingDuplicateEnergyMessage(
  geometry: SpectrumGeometryLabel,
  conflictingEnergies: readonly number[],
): string {
  const sorted = [...conflictingEnergies].sort((a, b) => a - b);
  const shown = sorted.slice(0, MAX_LISTED_ENERGIES);
  const remainder = sorted.length - shown.length;
  const energyList = shown.map((e) => `${e}`).join(", ");
  const more = remainder > 0 ? ` (and ${remainder} more)` : "";
  return (
    `Duplicate photon energies with conflicting values at theta=${geometry.theta} deg, ` +
    `phi=${geometry.phi} deg: ${energyList}${more} eV. ` +
    `Each energy may appear only once per polarization. Remove or merge the conflicting rows and try again.`
  );
}

/**
 * Builds a contributor-facing message when Prisma still reports the spectrum
 * unique constraint (for example after a race). Prefer
 * {@link prepareSpectrumPointsForUniqueEnergyInsert} before insert so this is
 * only a fallback.
 */
export function formatSpectrumPointsUniqueConstraintMessage(): string {
  return (
    "Spectrum insert failed because the same photon energy appears more than once " +
    "for one polarization. Each energy may appear only once per polarization; " +
    "remove duplicate rows and try again."
  );
}

/**
 * Returns whether a Prisma error is the spectrumpoints
 * `(experimentid, polarizationid, energyev)` unique violation (P2002).
 *
 * @param error Caught value from Prisma `createMany` / related writes.
 */
export function isSpectrumPointsEnergyUniqueViolation(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    (error as { code?: unknown }).code !== "P2002"
  ) {
    return false;
  }
  const meta = (error as { meta?: { target?: unknown } }).meta;
  const target = meta?.target;
  if (Array.isArray(target)) {
    const fields = target.map(String);
    return (
      fields.includes("experimentid") &&
      fields.includes("polarizationid") &&
      fields.includes("energyev")
    );
  }
  if (typeof target === "string") {
    return (
      target.includes("experimentid") &&
      target.includes("polarizationid") &&
      target.includes("energyev")
    );
  }
  return true;
}
