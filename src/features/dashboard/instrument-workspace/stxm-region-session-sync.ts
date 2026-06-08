import type {
  DashboardRegionsStepMetadata,
  StxmNormalizationWindows,
} from "~/lib/dashboard-processing-session";

/** Tracks whether editor state for a scan was loaded from session or auto-suggest. */
export type StxmRegionHydrationState = {
  scanId: string;
  fromSession: boolean;
} | null;

/** Alias for normalization window hydration; shares the same skip/re-hydrate policy as regions. */
export type StxmNormalizationHydrationState = StxmRegionHydrationState;

/**
 * Returns true when persisted session metadata includes sample or legacy region bounds.
 *
 * @param regionsMetadata - Per-scan regions step payload from the STXM session file.
 */
export function stxmSessionHasRegionBounds(
  regionsMetadata: DashboardRegionsStepMetadata | undefined,
): boolean {
  if (!regionsMetadata) {
    return false;
  }
  if (regionsMetadata.sampleRegions?.length && regionsMetadata.izeroBounds) {
    return true;
  }
  return regionsMetadata.bounds != null;
}

/**
 * Returns true when persisted session metadata includes film normalization windows.
 *
 * @param regionsMetadata - Per-scan regions step payload from the STXM session file.
 */
export function stxmSessionHasNormalization(
  regionsMetadata: DashboardRegionsStepMetadata | undefined,
): boolean {
  return stxmNormalizationWindowsComplete(regionsMetadata?.normalization);
}

/**
 * Validates that all four pre/post normalization edge energies are finite numbers.
 *
 * @param normalization - Candidate normalization windows from session or local state.
 */
export function stxmNormalizationWindowsComplete(
  normalization: StxmNormalizationWindows | null | undefined,
): normalization is StxmNormalizationWindows {
  if (!normalization) {
    return false;
  }
  return (
    Number.isFinite(normalization.preLo) &&
    Number.isFinite(normalization.preHi) &&
    Number.isFinite(normalization.postLo) &&
    Number.isFinite(normalization.postHi)
  );
}

/**
 * Decides whether local editor state should be replaced from session metadata.
 *
 * Skips sync while the user is interacting, after session values were already applied for the
 * active scan, or when auto-suggested values should remain until session data arrives.
 *
 * @param input.scanId - Active line-scan identifier.
 * @param input.hydration - Last hydration record for the field, if any.
 * @param input.isInteracting - True while a region, izero, or normalization drag is in progress.
 * @param input.sessionReady - True once the STXM session file has finished loading.
 * @param input.hasSessionValue - True when session metadata includes the field being hydrated.
 */
export function shouldHydrateEditorFieldFromSession(input: {
  scanId: string;
  hydration: StxmRegionHydrationState;
  isInteracting: boolean;
  sessionReady: boolean;
  hasSessionValue: boolean;
}): boolean {
  if (input.isInteracting) {
    return false;
  }
  if (input.hydration?.scanId === input.scanId) {
    if (input.hydration.fromSession) {
      return false;
    }
    if (!(input.hasSessionValue && input.sessionReady)) {
      return false;
    }
    return true;
  }
  return true;
}

/**
 * Decides whether local region editor state should be replaced from session metadata.
 *
 * @param input.hasSessionBounds - True when session metadata includes region bounds.
 */
export function shouldHydrateRegionsFromSession(input: {
  scanId: string;
  hydration: StxmRegionHydrationState;
  isInteracting: boolean;
  sessionReady: boolean;
  hasSessionBounds: boolean;
}): boolean {
  return shouldHydrateEditorFieldFromSession({
    scanId: input.scanId,
    hydration: input.hydration,
    isInteracting: input.isInteracting,
    sessionReady: input.sessionReady,
    hasSessionValue: input.hasSessionBounds,
  });
}

/**
 * Decides whether local normalization windows should be replaced from session metadata.
 *
 * @param input.hasSessionNormalization - True when session metadata includes normalization windows.
 */
export function shouldHydrateNormalizationFromSession(input: {
  scanId: string;
  hydration: StxmNormalizationHydrationState;
  isInteracting: boolean;
  sessionReady: boolean;
  hasSessionNormalization: boolean;
}): boolean {
  return shouldHydrateEditorFieldFromSession({
    scanId: input.scanId,
    hydration: input.hydration,
    isInteracting: input.isInteracting,
    sessionReady: input.sessionReady,
    hasSessionValue: input.hasSessionNormalization,
  });
}

/**
 * Records hydration source after applying session or auto-suggested bounds.
 *
 * @param scanId - Scan that was hydrated.
 * @param hasSessionBounds - Whether bounds came from session metadata (requires session ready).
 * @param sessionReady - Whether the session file load completed.
 */
export function stxmRegionHydrationAfterApply(
  scanId: string,
  hasSessionBounds: boolean,
  sessionReady: boolean,
): StxmRegionHydrationState {
  return {
    scanId,
    fromSession: hasSessionBounds && sessionReady,
  };
}

/**
 * Records hydration source after applying session or auto-suggested normalization windows.
 *
 * @param scanId - Scan that was hydrated.
 * @param hasSessionNormalization - Whether windows came from session metadata (requires session ready).
 * @param sessionReady - Whether the session file load completed.
 */
export function stxmNormalizationHydrationAfterApply(
  scanId: string,
  hasSessionNormalization: boolean,
  sessionReady: boolean,
): StxmNormalizationHydrationState {
  return stxmRegionHydrationAfterApply(
    scanId,
    hasSessionNormalization,
    sessionReady,
  );
}
