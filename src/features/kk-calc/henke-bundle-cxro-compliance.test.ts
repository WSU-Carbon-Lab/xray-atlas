/**
 * Verifies bundled Henke `f_2` tables (`kkcalc-henke-element-f2.bundle.json`) stay aligned with live
 * LBL CXRO `.nff` data (`henke.lbl.gov`), the same source as `~/server/utils/cxro.ts` bare-atom mass
 * absorption and `~/lib/henke-nff-cxro.ts` parsing.
 *
 * On GitHub Actions, set `KK_HENKE_NETWORK_TEST=1` to enable the live fetch assertion; otherwise the
 * case is skipped so default CI does not depend on outbound Henke availability.
 */

import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";

import {
  henkeLblElementNffUrl,
  linearInterpHenkeF2Sorted,
  parseHenkeLblNffText,
} from "~/lib/henke-nff-cxro";

import { henkeElementF2AtEv } from "./kkcalc-henke-f2";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeLessThanOrEqual: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const skipLiveHenke =
  process.env.CI === "true" && process.env.KK_HENKE_NETWORK_TEST !== "1";

describe("Henke bundle vs CXRO LBL .nff", () => {
  it("bundled elemental f2 matches CXRO linear interpolation at probe energies", async () => {
    if (skipLiveHenke) {
      return;
    }
    const url = henkeLblElementNffUrl("C");
    const res = await fetch(url, {
      headers: { "User-Agent": "xray-atlas-henke-compliance-test/1.0" },
    });
    expect(res.ok).toBe(true);
    const parsed = parseHenkeLblNffText(await res.text());
    const fullE = [...parsed.energiesEv];
    const fullF2 = [...parsed.f2];
    const probeEv = [284, 290, 400, 600, 1200, 2400, 4800];
    for (const ev of probeEv) {
      const fromCxro = linearInterpHenkeF2Sorted(fullE, fullF2, ev);
      const fromBundle = henkeElementF2AtEv("C", ev);
      const tol = 1e-5 * (1 + Math.abs(fromCxro));
      expect(Math.abs(fromBundle - fromCxro)).toBeLessThanOrEqual(tol);
    }
  });
});
