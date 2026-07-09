import {
  describe as bunDescribe,
  it as bunIt,
  expect as bunExpect,
} from "bun:test";
import {
  betaFromMassAbsorption,
  massAbsorptionFromBeta,
  massAbsorptionFromEpsilon2,
} from "./opticalConstants";
import {
  buildMassAbsorptionHubPoints,
  deriveOdAndBetaFromHub,
} from "./representationToMassAbsorption";

type ExpectAssertions = {
  toBeCloseTo: (expected: number, precision: number) => void;
  toHaveLength: (length: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("opticalConstants", () => {
  it("round-trips beta and mass absorption at fixed energy", () => {
    const E = 285;
    const beta = 4.2e-5;
    const mu = massAbsorptionFromBeta(beta, E);
    const betaBack = betaFromMassAbsorption(mu, E);
    expect(betaBack).toBeCloseTo(beta, 12);
  });

  it("maps epsilon2 to mass absorption via beta = eps2/2", () => {
    const E = 280;
    const eps2 = 8e-5;
    const mu = massAbsorptionFromEpsilon2(eps2, E);
    const beta = betaFromMassAbsorption(mu, E);
    expect(beta).toBeCloseTo(eps2 / 2, 12);
  });
});

describe("representationToMassAbsorption", () => {
  it("builds hub from uploaded beta primary without bare-atom windows", () => {
    const points = [
      { energy: 280, absorption: 1.1e-5, beta: 1.1e-5 },
      { energy: 290, absorption: 4.2e-5, beta: 4.2e-5 },
    ];
    const hub = buildMassAbsorptionHubPoints(points, "beta", {
      barePoints: [],
      pre: null,
      post: null,
    });
    expect(hub).toHaveLength(2);
    expect(hub![0]!.massabsorption!).toBeCloseTo(
      massAbsorptionFromBeta(1.1e-5, 280),
      10,
    );
  });

  it("derives beta from hub consistently with uploaded beta primary", () => {
    const points = [
      { energy: 280, absorption: 1.1e-5, beta: 1.1e-5 },
      { energy: 290, absorption: 4.2e-5, beta: 4.2e-5 },
    ];
    const hub = buildMassAbsorptionHubPoints(points, "beta", {
      barePoints: [],
      pre: null,
      post: null,
    })!;
    const derived = deriveOdAndBetaFromHub(hub, [275, 278], [295, 298]);
    expect(derived.beta[0]!).toBeCloseTo(1.1e-5, 10);
    expect(derived.beta[1]!).toBeCloseTo(4.2e-5, 10);
  });
});
