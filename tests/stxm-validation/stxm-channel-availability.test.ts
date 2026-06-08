import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmChannelAvailabilityContext,
  canComputeStxmChannel,
  describeStxmChannelUnavailableReason,
  resolveStxmPlotEmptyState,
  stxmChannelRequirementKind,
  stxmHasPairedBetaDelta,
} from "~/lib/stxm/stxm-channel-availability";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const ENERGY_EV = [280, 285, 290];
const BETA = [0.001, 0.002, 0.0015];
const DELTA = [1e-5, 2e-5, 1.5e-5];

function ctx(
  channel: Parameters<typeof buildStxmChannelAvailabilityContext>[0]["channel"],
  overrides: Partial<
    Omit<Parameters<typeof buildStxmChannelAvailabilityContext>[0], "channel">
  > = {},
) {
  return buildStxmChannelAvailabilityContext({
    channel,
    regionSpectra: [{ isIzero: true }, { isIzero: false }],
    hasReducedResult: true,
    hasLinkedMolecule: true,
    chemicalFormula: "C8H8",
    energyEv: ENERGY_EV,
    beta: BETA,
    delta: DELTA,
    derivedOpticalAvailable: true,
    hasIeData: true,
    isTeyExperiment: true,
    ...overrides,
  });
}

describe("STXM channel availability", () => {
  it("classifies raw, normalization, formula, kk, and derived requirements", () => {
    expect(stxmChannelRequirementKind("signal_it")).toBe("raw");
    expect(stxmChannelRequirementKind("od_normalized")).toBe("normalization");
    expect(stxmChannelRequirementKind("mass_absorption")).toBe("formula");
    expect(stxmChannelRequirementKind("delta")).toBe("kk");
    expect(stxmChannelRequirementKind("f2")).toBe("derived-optical");
  });

  it("allows raw OD without reduction when regions are configured", () => {
    expect(
      canComputeStxmChannel(
        ctx("od", {
          hasReducedResult: false,
          regionSpectra: [{ isIzero: true }, { isIzero: false }],
        }),
      ),
    ).toBe(true);
  });

  it("blocks mass absorption and derived optical channels without formula", () => {
    expect(
      canComputeStxmChannel(
        ctx("mass_absorption", {
          chemicalFormula: null,
          derivedOpticalAvailable: false,
        }),
      ),
    ).toBe(false);
    expect(
      canComputeStxmChannel(
        ctx("f2", {
          chemicalFormula: null,
          derivedOpticalAvailable: false,
        }),
      ),
    ).toBe(false);
    expect(canComputeStxmChannel(ctx("beta", { chemicalFormula: null }))).toBe(
      true,
    );
  });

  it("blocks delta when KK beta/delta are missing", () => {
    expect(
      canComputeStxmChannel(
        ctx("delta", {
          beta: null,
          delta: null,
        }),
      ),
    ).toBe(false);
  });

  it("reports molecule-specific disabled reasons on the rail", () => {
    expect(
      describeStxmChannelUnavailableReason(
        ctx("f2", {
          hasLinkedMolecule: false,
          chemicalFormula: null,
          derivedOpticalAvailable: false,
        }),
      ),
    ).toContain("Link an Atlas molecule");
    expect(
      describeStxmChannelUnavailableReason(
        ctx("mass_absorption", {
          hasLinkedMolecule: true,
          chemicalFormula: "",
        }),
      ),
    ).toContain("no chemical formula");
  });

  it("builds plot empty state copy for missing molecule on derived channels", () => {
    const empty = resolveStxmPlotEmptyState(
      ctx("im-epsilon", {
        hasLinkedMolecule: false,
        chemicalFormula: null,
        derivedOpticalAvailable: false,
      }),
    );
    expect(empty.title).toBe("Molecule required");
    expect(empty.detail).toContain("Link an Atlas molecule");
    expect(empty.actionLabel).toBe("Select molecule above");
  });

  it("detects paired beta and delta arrays", () => {
    expect(stxmHasPairedBetaDelta(ENERGY_EV, BETA, DELTA)).toBe(true);
    expect(stxmHasPairedBetaDelta(ENERGY_EV, BETA, null)).toBe(false);
  });

  it("returns undefined unavailable reason when channel can render", () => {
    expect(describeStxmChannelUnavailableReason(ctx("signal_it"))).toBeUndefined();
  });
});
