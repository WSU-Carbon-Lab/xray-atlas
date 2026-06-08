import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  facilityFaviconPreviewUrl,
  facilityWebsiteHostname,
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

  it("facilityWebsiteHostname extracts host from validated URLs", () => {
    expect(facilityWebsiteHostname("https://als.lbl.gov/")).toBe("als.lbl.gov");
    expect(facilityWebsiteHostname("")).toBe(null);
  });

  it("facilityFaviconPreviewUrl prefers saved favicon when draft matches saved URL", () => {
    expect(
      facilityFaviconPreviewUrl(
        "https://als.lbl.gov/",
        "https://als.lbl.gov/",
        "https://als.lbl.gov/wp-content/uploads/2016/07/cropped-favicon-32x32.png",
      ),
    ).toBe(
      "https://als.lbl.gov/wp-content/uploads/2016/07/cropped-favicon-32x32.png",
    );
  });

  it("facilityFaviconPreviewUrl uses Google fallback for changed drafts", () => {
    expect(
      facilityFaviconPreviewUrl(
        "https://www.example.org/",
        "https://als.lbl.gov/",
        "https://als.lbl.gov/favicon.ico",
      ),
    ).toBe("https://www.google.com/s2/favicons?domain=www.example.org&sz=64");
  });
});
