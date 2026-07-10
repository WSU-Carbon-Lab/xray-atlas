import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  coerceZenodoDepositUiState,
  isStaleZenodoInFlight,
  resolveZenodoDoiButtonMode,
  ZENODO_IN_FLIGHT_STALE_MS,
} from "~/lib/zenodo-doi-button-mode";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveZenodoDoiButtonMode", () => {
  it("links to Zenodo record URL when DOI is published", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: "10.5281/zenodo.99",
        zenodoRecordUrl: "https://zenodo.org/records/99",
        depositState: "published",
        canMint: false,
        mintingEnabled: true,
        isMutating: false,
      }),
    ).toEqual({
      kind: "link",
      href: "https://zenodo.org/records/99",
      doi: "10.5281/zenodo.99",
    });
  });

  it("falls back to doi.org when record URL is missing", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: "10.5281/zenodo.99",
        zenodoRecordUrl: null,
        depositState: "published",
        canMint: true,
        mintingEnabled: true,
        isMutating: false,
      }),
    ).toEqual({
      kind: "link",
      href: "https://doi.org/10.5281/zenodo.99",
      doi: "10.5281/zenodo.99",
    });
  });

  it("shows busy while depositing or mutating", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: "depositing",
        canMint: true,
        mintingEnabled: true,
        isMutating: false,
      }).kind,
    ).toBe("busy");

    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: null,
        canMint: true,
        mintingEnabled: true,
        isMutating: true,
      }).kind,
    ).toBe("busy");
  });

  it("does not spin when minting is disabled even if deposit looks in-flight", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: "depositing",
        canMint: true,
        mintingEnabled: false,
        isMutating: false,
      }),
    ).toEqual({
      kind: "mint",
      enabled: false,
      hint: "Zenodo DOI minting is not configured on this deployment.",
    });
  });

  it("offers retry when poll budget is exhausted while still in-flight", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: "depositing",
        canMint: true,
        mintingEnabled: true,
        isMutating: false,
        pollExhausted: true,
      }).kind,
    ).toBe("retry");
  });

  it("enables mint for editors when no DOI exists", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: null,
        canMint: true,
        mintingEnabled: true,
        isMutating: false,
      }),
    ).toEqual({
      kind: "mint",
      enabled: true,
      hint: "Mint an Atlas dataset DOI on Zenodo",
    });
  });

  it("disables mint for viewers without a DOI", () => {
    const mode = resolveZenodoDoiButtonMode({
      datasetDoi: null,
      zenodoRecordUrl: null,
      depositState: null,
      canMint: false,
      mintingEnabled: true,
      isMutating: false,
    });
    expect(mode.kind).toBe("mint");
    if (mode.kind === "mint") {
      expect(mode.enabled).toBe(false);
    }
  });

  it("offers retry after failed mint for editors", () => {
    expect(
      resolveZenodoDoiButtonMode({
        datasetDoi: null,
        zenodoRecordUrl: null,
        depositState: "failed",
        canMint: true,
        mintingEnabled: true,
        isMutating: false,
      }).kind,
    ).toBe("retry");
  });
});

describe("coerceZenodoDepositUiState", () => {
  const nowMs = Date.parse("2026-07-10T16:00:00.000Z");

  it("treats never-started pending as idle", () => {
    expect(
      coerceZenodoDepositUiState({
        state: "pending",
        lastAttemptAt: null,
        attemptCount: 0,
        nowMs,
      }),
    ).toBe(null);
  });

  it("treats stale depositing as failed", () => {
    expect(
      coerceZenodoDepositUiState({
        state: "depositing",
        lastAttemptAt: new Date(nowMs - ZENODO_IN_FLIGHT_STALE_MS - 1),
        attemptCount: 1,
        nowMs,
      }),
    ).toBe("failed");
  });

  it("keeps fresh depositing as depositing", () => {
    expect(
      coerceZenodoDepositUiState({
        state: "depositing",
        lastAttemptAt: new Date(nowMs - 60_000),
        attemptCount: 1,
        nowMs,
      }),
    ).toBe("depositing");
  });

  it("isStaleZenodoInFlight is true without lastAttemptAt", () => {
    expect(
      isStaleZenodoInFlight({
        state: "depositing",
        lastAttemptAt: null,
        nowMs,
      }),
    ).toBe(true);
  });
});
