import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import type { SpectrumPoint } from "~/components/plots/types";
import { buildNexafsSpectrumExportCsv } from "./spectrumExportCsv";

type ExpectAssertions = {
  toContain: (expected: string) => void;
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const samplePoints: SpectrumPoint[] = [
  {
    energy: 280,
    absorption: 0.12,
    rawabs: 0.11,
    od: 0.5,
    massabsorption: 0.12,
    beta: 0.02,
    delta: 0.001,
    theta: 55,
    phi: 0,
  },
  {
    energy: 285,
    absorption: 0.18,
    rawabs: 0.17,
    od: 0.55,
    massabsorption: 0.18,
    beta: 0.03,
    delta: 0.002,
    theta: 55,
    phi: 0,
  },
  {
    energy: 290,
    absorption: 0.22,
    rawabs: 0.21,
    od: 0.6,
    massabsorption: 0.22,
    beta: 0.04,
    delta: 0.003,
    theta: 55,
    phi: 0,
  },
];

describe("buildNexafsSpectrumExportCsv", () => {
  it("includes derived f and epsilon headers when formula and beta/delta are present", async () => {
    const result = await buildNexafsSpectrumExportCsv(samplePoints, {
      stoichiometryFormula: "C8H8",
      includeBareAtom: false,
    });
    const header = result.csv.split("\n")[0] ?? "";
    expect(header).toContain("energy_eV");
    expect(header).toContain("f2");
    expect(header).toContain("f1");
    expect(header).toContain("im_epsilon");
    expect(header).toContain("re_epsilon");
    expect(header).toContain("im_chi");
    expect(header).toContain("re_chi");
    expect(result.omittedDerivedColumns).toBe(false);
    expect(result.rowCount).toBe(3);
  });

  it("omits derived columns without a stoichiometry formula", async () => {
    const result = await buildNexafsSpectrumExportCsv(samplePoints, {
      includeBareAtom: false,
    });
    const header = result.csv.split("\n")[0] ?? "";
    expect(header).toContain("energy_eV");
    expect(header).toContain("beta");
    expect(result.omittedDerivedColumns).toBe(true);
  });
});
