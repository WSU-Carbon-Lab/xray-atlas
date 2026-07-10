/**
 * Pure presentation modes for the NEXAFS card Cite | doi control's DOI segment.
 *
 * Keeps link vs mint vs busy vs retry decisions out of React so browse cards and
 * unit tests share one contract. Does not call Zenodo or tRPC.
 *
 * Also owns stale in-flight coercion: hung `pending`/`depositing` rows must not
 * keep the UI in a forever-spinner.
 */

import { formatDoiCitationUrl } from "~/lib/dataset-citation";

export type ZenodoDepositUiState =
  | "pending"
  | "depositing"
  | "published"
  | "failed"
  | null;

/** Resolved presentation mode for the Cite | doi control's DOI segment. */
export type ZenodoDoiButtonMode =
  | { kind: "link"; href: string; doi: string }
  | { kind: "busy"; label: string }
  | { kind: "mint"; enabled: boolean; hint: string }
  | { kind: "retry"; enabled: boolean; hint: string };

/**
 * Matches the server mint overall budget. In-flight deposit rows whose last
 * attempt is older than this are treated as stalled (show Retry, stop polling).
 */
export const ZENODO_IN_FLIGHT_STALE_MS = 10 * 60 * 1_000;

/**
 * Client poll budget while watching a live mint (~60s at 2.5s interval).
 * After this many status fetches without a terminal state, the UI exits busy.
 */
export const ZENODO_STATUS_MAX_POLLS = 24;

/**
 * Reports whether a deposit row claiming to be in flight is too old to keep
 * showing a busy spinner.
 *
 * @param input - Deposit state, last attempt clock, and optional now override.
 * @returns True when `pending`/`depositing` should be treated as stalled.
 */
export function isStaleZenodoInFlight(input: {
  state: string | null | undefined;
  lastAttemptAt: Date | string | null | undefined;
  nowMs?: number;
}): boolean {
  if (input.state !== "pending" && input.state !== "depositing") {
    return false;
  }
  const nowMs = input.nowMs ?? Date.now();
  if (input.lastAttemptAt == null) {
    return true;
  }
  const attemptMs =
    typeof input.lastAttemptAt === "string"
      ? Date.parse(input.lastAttemptAt)
      : input.lastAttemptAt.getTime();
  if (!Number.isFinite(attemptMs)) {
    return true;
  }
  return nowMs - attemptMs > ZENODO_IN_FLIGHT_STALE_MS;
}

/**
 * Coerces raw deposit workflow state for UI: never-started pending becomes idle;
 * stale in-flight becomes failed; fresh in-flight and terminal states pass through.
 *
 * @param input - Raw state plus attempt metadata from browse or status queries.
 * @returns UI-safe deposit state (never a forever-busy stale in-flight).
 */
export function coerceZenodoDepositUiState(input: {
  state: string | null | undefined;
  lastAttemptAt?: Date | string | null;
  attemptCount?: number | null;
  nowMs?: number;
}): ZenodoDepositUiState {
  const raw = input.state;
  if (
    raw !== "pending" &&
    raw !== "depositing" &&
    raw !== "published" &&
    raw !== "failed"
  ) {
    return null;
  }

  if (raw === "published" || raw === "failed") {
    return raw;
  }

  const attemptCount = input.attemptCount ?? 0;
  if (
    raw === "pending" &&
    attemptCount <= 0 &&
    input.lastAttemptAt == null
  ) {
    return null;
  }

  if (
    isStaleZenodoInFlight({
      state: raw,
      lastAttemptAt: input.lastAttemptAt ?? null,
      nowMs: input.nowMs,
    })
  ) {
    return "failed";
  }

  return raw;
}

/**
 * Chooses DOI-segment behavior from deposit DOI, workflow state, and edit rights.
 *
 * @param input - Current DOI/record URL, deposit state, and whether the viewer may mint.
 * @returns Discriminated mode for link, busy spinner, mint, or retry.
 */
export function resolveZenodoDoiButtonMode(input: {
  datasetDoi: string | null;
  zenodoRecordUrl: string | null;
  depositState: ZenodoDepositUiState;
  canMint: boolean;
  mintingEnabled: boolean | null;
  isMutating: boolean;
  /** When true, client poll budget exhausted while still in-flight. */
  pollExhausted?: boolean;
}): ZenodoDoiButtonMode {
  const doiTrimmed = input.datasetDoi?.trim();
  const doi = doiTrimmed && doiTrimmed.length > 0 ? doiTrimmed : null;
  if (doi) {
    const recordTrimmed = input.zenodoRecordUrl?.trim();
    const recordUrl =
      recordTrimmed && recordTrimmed.length > 0 ? recordTrimmed : null;
    const doiUrl = formatDoiCitationUrl(doi);
    const href = recordUrl ?? doiUrl ?? `https://doi.org/${doi}`;
    return { kind: "link", href, doi };
  }

  if (input.isMutating) {
    return { kind: "busy", label: "Minting dataset DOI on Zenodo" };
  }

  if (input.mintingEnabled === false) {
    return {
      kind: "mint",
      enabled: false,
      hint: "Zenodo DOI minting is not configured on this deployment.",
    };
  }

  const inFlight =
    input.depositState === "pending" || input.depositState === "depositing";

  if (inFlight && input.pollExhausted) {
    if (!input.canMint) {
      return {
        kind: "retry",
        enabled: false,
        hint: "Dataset DOI mint stalled. Contributors with edit access can retry.",
      };
    }
    return {
      kind: "retry",
      enabled: true,
      hint: "Zenodo mint is taking too long. Press to retry.",
    };
  }

  if (inFlight) {
    return { kind: "busy", label: "Minting dataset DOI on Zenodo" };
  }

  if (input.depositState === "failed") {
    if (!input.canMint) {
      return {
        kind: "retry",
        enabled: false,
        hint: "Dataset DOI mint failed. Contributors with edit access can retry.",
      };
    }
    return {
      kind: "retry",
      enabled: true,
      hint: "Previous Zenodo mint failed. Press to retry.",
    };
  }

  if (!input.canMint) {
    return {
      kind: "mint",
      enabled: false,
      hint: "Dataset DOI not minted yet. Contributors with edit access can mint from this control.",
    };
  }

  return {
    kind: "mint",
    enabled: true,
    hint: "Mint an Atlas dataset DOI on Zenodo",
  };
}
