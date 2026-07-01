export type KkDeltaSubmitSpectrumPoint = {
  beta?: number;
  delta?: number;
};

/**
 * Returns ingest-time validation messages for `computeKkDeltaOnSubmit`.
 * Empty when KK at upload is not requested or prerequisites are satisfied.
 */
export function kkDeltaSubmitValidationErrors(
  computeKkDeltaOnSubmit: boolean | undefined,
  points: readonly KkDeltaSubmitSpectrumPoint[],
): string[] {
  if (computeKkDeltaOnSubmit !== true) {
    return [];
  }
  const errors: string[] = [];
  const hasFiniteDelta = points.some(
    (p) => typeof p.delta === "number" && Number.isFinite(p.delta),
  );
  if (!hasFiniteDelta) {
    errors.push(
      "computeKkDeltaOnSubmit requires finite delta on at least one spectrum point",
    );
  }
  const hasFiniteBetaOnEveryPoint =
    points.length > 0 &&
    points.every((p) => typeof p.beta === "number" && Number.isFinite(p.beta));
  if (!hasFiniteBetaOnEveryPoint) {
    errors.push(
      "computeKkDeltaOnSubmit requires finite beta on every spectrum point",
    );
  }
  return errors;
}
