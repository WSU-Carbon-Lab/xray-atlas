import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  googleFaviconUrlForHostname,
  parseFacilityWebsiteUrlInput,
  trimFacilityWebsiteUrl,
} from "./facility-website-url";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toThrow: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("facility website URL helpers", () => {
  it("trimFacilityWebsiteUrl returns null for blank input", () => {
    expect(trimFacilityWebsiteUrl("   ")).toBe(null);
  });

  it("parseFacilityWebsiteUrlInput accepts https URLs and rejects bare domains", () => {
    expect(parseFacilityWebsiteUrlInput("https://www.example.org/about")).toBe(
      "https://www.example.org/about",
    );
    expect(() => parseFacilityWebsiteUrlInput("example.org")).toThrow();
  });

  it("parseFacilityWebsiteUrlInput clears on empty string", () => {
    expect(parseFacilityWebsiteUrlInput("")).toBe(null);
  });

  it("googleFaviconUrlForHostname encodes the hostname", () => {
    expect(googleFaviconUrlForHostname("als.lbl.gov")).toBe(
      "https://www.google.com/s2/favicons?domain=als.lbl.gov&sz=64",
    );
  });
});
