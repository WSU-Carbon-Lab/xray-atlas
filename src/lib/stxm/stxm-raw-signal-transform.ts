/**
 * Y-axis transforms for STXM raw intensity channels (I0, It, Ie) before SpectrumPlot.
 */

/** Linear intensity, reciprocal 1/s, or log10(1/s) on the active raw intensity trace. */
export type StxmRawSignalTransformMode =
  | "signal"
  | "reciprocal"
  | "log_reciprocal";

const SIGNAL_INVERSE_MIN = 1e-12;

/**
 * Maps legacy persisted I0 plot scale keys to raw-signal transform modes.
 */
export function migrateStxmRawSignalTransformMode(
  legacy:
    | StxmRawSignalTransformMode
    | "linear"
    | "log_i"
    | "log_inv"
    | undefined,
): StxmRawSignalTransformMode {
  if (legacy === "reciprocal" || legacy === "log_reciprocal" || legacy === "signal") {
    return legacy;
  }
  if (legacy === "log_inv") {
    return "log_reciprocal";
  }
  return "signal";
}

/**
 * Applies the selected raw-intensity transform to one scalar signal value.
 */
export function applyStxmRawSignalTransform(
  signal: number,
  mode: StxmRawSignalTransformMode,
): number {
  if (!Number.isFinite(signal)) {
    return Number.NaN;
  }
  if (mode === "signal") {
    return signal;
  }
  const reciprocal = 1 / Math.max(signal, SIGNAL_INVERSE_MIN);
  if (mode === "reciprocal") {
    return reciprocal;
  }
  if (reciprocal <= 0 || !Number.isFinite(reciprocal)) {
    return Number.NaN;
  }
  return Math.log10(reciprocal);
}

/**
 * Propagates Poisson-style sigma through reciprocal or log-reciprocal transforms.
 */
export function applyStxmRawSignalTransformError(
  signal: number,
  signalErr: number | undefined,
  mode: StxmRawSignalTransformMode,
): number | undefined {
  if (
    mode === "signal" ||
    signalErr === undefined ||
    !Number.isFinite(signalErr) ||
    !Number.isFinite(signal)
  ) {
    return mode === "signal" ? signalErr : undefined;
  }
  const clamped = Math.max(signal, SIGNAL_INVERSE_MIN);
  if (mode === "reciprocal") {
    const err = signalErr / (clamped * clamped);
    return Number.isFinite(err) ? err : undefined;
  }
  const reciprocal = 1 / clamped;
  const logErr = signalErr / (clamped * reciprocal * Math.LN10);
  return Number.isFinite(logErr) ? Math.abs(logErr) : undefined;
}
