import { describe, it, expect } from "bun:test";
import { computeBetaIndex } from "./betaIndex";

describe("computeBetaIndex", () => {
  it("converts mu-like absorption to beta using beta = mu*lambda/(4*pi)", () => {
    const E = 100;
    const normalizedPoints = [{ energy: E, absorption: 1 }];
    const energyEv = [E];
    const atomicScatteringFactors = [{ energy: E, absorption: 1 }];

    const out = computeBetaIndex(
      normalizedPoints,
      energyEv,
      atomicScatteringFactors,
    );

    const hcEvCm = 1.23984193e-4;
    const expected = (hcEvCm / E) / (4 * Math.PI);
    expect(out).toHaveLength(1);
    expect(out[0]!.absorption).toBeCloseTo(expected, 12);
  });

  it("scales relative normalized values by bare-atom absorption when normalized is much smaller", () => {
    const E = 100;
    const normalizedPoints = [{ energy: E, absorption: 0.1 }];
    const energyEv = [E];
    const atomicScatteringFactors = [{ energy: E, absorption: 10 }];

    const out = computeBetaIndex(
      normalizedPoints,
      energyEv,
      atomicScatteringFactors,
    );

    const hcEvCm = 1.23984193e-4;
    const expected = (hcEvCm / E) / (4 * Math.PI);
    expect(out).toHaveLength(1);
    expect(out[0]!.absorption).toBeCloseTo(expected, 12);
  });
});

