import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  buildStxmEnergyValidityMask,
  detectStxmIntensityGlitches,
} from "~/lib/stxm/detect-stxm-intensity-glitches";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("detectStxmIntensityGlitches", () => {
  it("flags terminal paired I0 collapse and It surge", () => {
    const i0 = [1000, 1010, 1020, 40];
    const it = [500, 480, 460, 900];
    const energyEv = [388, 389, 389.5, 390];
    const glitches = detectStxmIntensityGlitches(i0, it, energyEv);
    expect(glitches).toHaveLength(1);
    const glitch = glitches[0] as {
      energyIndex: number;
      reason: string;
      energyEv: number;
    };
    expect(glitch.energyIndex).toBe(3);
    expect(glitch.energyEv).toBe(390);
    expect(glitch.reason).toBe("paired_i0_it_spike");
  });

  it("flags It exceeding I0 when neighbors are stable", () => {
    const i0 = [1000, 1000, 900];
    const it = [500, 1100, 480];
    const glitches = detectStxmIntensityGlitches(i0, it);
    expect(glitches).toHaveLength(1);
    const glitch = glitches[0] as { energyIndex: number; reason: string };
    expect(glitch.energyIndex).toBe(1);
    expect(glitch.reason).toBe("it_exceeds_i0");
  });

  it("returns no glitches for monotonic absorption edge trend", () => {
    const i0 = [1000, 1010, 1020];
    const it = [500, 400, 300];
    const glitches = detectStxmIntensityGlitches(i0, it);
    expect(glitches).toHaveLength(0);
  });
});

describe("buildStxmEnergyValidityMask", () => {
  it("rejects glitch energies while keeping interior points valid", () => {
    const i0 = [1000, 1010, 1020, 40];
    const it = [500, 480, 460, 900];
    const mask = buildStxmEnergyValidityMask(i0, it);
    expect(mask).toHaveLength(4);
    expect(mask[0]).toBe(true);
    expect(mask[1]).toBe(true);
    expect(mask[2]).toBe(true);
    expect(mask[3]).toBe(false);
  });
});
