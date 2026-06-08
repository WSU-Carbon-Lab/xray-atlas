import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  shouldHydrateEditorFieldFromSession,
  shouldHydrateNormalizationFromSession,
  shouldHydrateRegionsFromSession,
  stxmNormalizationHydrationAfterApply,
  stxmNormalizationWindowsComplete,
  stxmRegionHydrationAfterApply,
  stxmSessionHasNormalization,
  stxmSessionHasRegionBounds,
  type StxmRegionHydrationState,
} from "~/features/dashboard/instrument-workspace/stxm-region-session-sync";
import type {
  DashboardRegionsStepMetadata,
  StxmNormalizationWindows,
} from "~/lib/dashboard-processing-session";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const scanA = "beamtime/scan-a.hdr";

const sessionRegions = (sampleLo: number): DashboardRegionsStepMetadata => ({
  scanId: scanA,
  sampleRegions: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sampleLo,
      sampleHi: sampleLo + 1,
      spotLabel: "pure",
      role: "pure",
    },
  ],
  izeroBounds: { izeroLo: 10, izeroHi: 11 },
  pureRegionId: "11111111-1111-4111-8111-111111111111",
  weightingMode: "poisson_mle",
});

const completeNormalization: StxmNormalizationWindows = {
  preLo: 270,
  preHi: 280,
  postLo: 320,
  postHi: 330,
};

const sessionWithNormalization = (
  sampleLo: number,
  normalization: StxmNormalizationWindows,
): DashboardRegionsStepMetadata => ({
  ...sessionRegions(sampleLo),
  normalization,
});

describe("stxmSessionHasRegionBounds", () => {
  it("detects multi-region session payloads", () => {
    expect(stxmSessionHasRegionBounds(sessionRegions(2))).toBe(true);
  });

  it("returns false for empty metadata", () => {
    expect(stxmSessionHasRegionBounds(undefined)).toBe(false);
  });
});

describe("shouldHydrateRegionsFromSession", () => {
  it("skips sync while the user is interacting", () => {
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration: null,
        isInteracting: true,
        sessionReady: true,
        hasSessionBounds: true,
      }),
    ).toBe(false);
  });

  it("skips re-hydrate when session bounds were already applied for the scan", () => {
    const hydration: StxmRegionHydrationState = stxmRegionHydrationAfterApply(
      scanA,
      true,
      true,
    );
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionBounds: true,
      }),
    ).toBe(false);
  });

  it("upgrades auto-suggest to session once session data arrives", () => {
    const autoHydration: StxmRegionHydrationState = stxmRegionHydrationAfterApply(
      scanA,
      false,
      false,
    );
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration: autoHydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionBounds: true,
      }),
    ).toBe(true);
  });

  it("keeps local bounds when auto-suggested and session still empty", () => {
    const autoHydration: StxmRegionHydrationState = stxmRegionHydrationAfterApply(
      scanA,
      false,
      true,
    );
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration: autoHydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionBounds: false,
      }),
    ).toBe(false);
  });

  it("hydrates on first load for a scan", () => {
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration: null,
        isInteracting: false,
        sessionReady: true,
        hasSessionBounds: true,
      }),
    ).toBe(true);
  });

  it("hydrates after switching to a different scan", () => {
    const otherScanHydration: StxmRegionHydrationState =
      stxmRegionHydrationAfterApply("beamtime/other.hdr", true, true);
    expect(
      shouldHydrateRegionsFromSession({
        scanId: scanA,
        hydration: otherScanHydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionBounds: true,
      }),
    ).toBe(true);
  });
});

describe("stxmSessionHasNormalization", () => {
  it("detects complete normalization windows in session metadata", () => {
    expect(
      stxmSessionHasNormalization(sessionWithNormalization(2, completeNormalization)),
    ).toBe(true);
  });

  it("returns false when normalization is missing or incomplete", () => {
    expect(stxmSessionHasNormalization(undefined)).toBe(false);
    expect(stxmSessionHasNormalization(sessionRegions(2))).toBe(false);
    expect(
      stxmNormalizationWindowsComplete({
        preLo: 270,
        preHi: Number.NaN,
        postLo: 320,
        postHi: 330,
      }),
    ).toBe(false);
  });
});

describe("shouldHydrateNormalizationFromSession", () => {
  it("skips sync while normalization handles are dragged", () => {
    expect(
      shouldHydrateNormalizationFromSession({
        scanId: scanA,
        hydration: null,
        isInteracting: true,
        sessionReady: true,
        hasSessionNormalization: true,
      }),
    ).toBe(false);
  });

  it("skips re-hydrate after session normalization was applied for the scan", () => {
    const hydration = stxmNormalizationHydrationAfterApply(scanA, true, true);
    expect(
      shouldHydrateNormalizationFromSession({
        scanId: scanA,
        hydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionNormalization: true,
      }),
    ).toBe(false);
  });

  it("upgrades auto-suggest to session once normalization arrives", () => {
    const autoHydration = stxmNormalizationHydrationAfterApply(scanA, false, false);
    expect(
      shouldHydrateNormalizationFromSession({
        scanId: scanA,
        hydration: autoHydration,
        isInteracting: false,
        sessionReady: true,
        hasSessionNormalization: true,
      }),
    ).toBe(true);
  });
});

describe("shouldHydrateEditorFieldFromSession", () => {
  it("shares the same hydration policy for regions and normalization helpers", () => {
    const hydration = stxmRegionHydrationAfterApply(scanA, true, true);
    const sharedInput = {
      scanId: scanA,
      hydration,
      isInteracting: false,
      sessionReady: true,
    };
    expect(
      shouldHydrateEditorFieldFromSession({
        ...sharedInput,
        hasSessionValue: true,
      }),
    ).toBe(false);
    expect(
      shouldHydrateRegionsFromSession({
        ...sharedInput,
        hasSessionBounds: true,
      }),
    ).toBe(false);
    expect(
      shouldHydrateNormalizationFromSession({
        ...sharedInput,
        hasSessionNormalization: true,
      }),
    ).toBe(false);
  });
});
