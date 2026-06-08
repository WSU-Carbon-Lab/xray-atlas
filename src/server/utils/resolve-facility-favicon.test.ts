import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { resolveFacilityFaviconUrl } from "./resolve-facility-favicon";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toContain: (expected: string) => void;
  not: { toBe: (expected: unknown) => void };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("resolveFacilityFaviconUrl", () => {
  it("returns null when website URL is empty", async () => {
    expect(await resolveFacilityFaviconUrl("")).toBe(null);
    expect(await resolveFacilityFaviconUrl("   ")).toBe(null);
    expect(await resolveFacilityFaviconUrl(null)).toBe(null);
  });

  it("resolves als.lbl.gov to a non-empty favicon, not the zero-byte favicon.ico", async () => {
    const result = await resolveFacilityFaviconUrl("https://als.lbl.gov/");
    expect(result).not.toBe(null);
    expect(result as string).not.toBe("https://als.lbl.gov/favicon.ico");
    const url = result as string;
    const isGoogleFallback = url.includes("google.com/s2/favicons");
    const isAlsPng = url.includes("cropped-favicon");
    if (!isGoogleFallback && !isAlsPng) {
      throw new Error(`Unexpected favicon URL for ALS: ${url}`);
    }
  });
});
