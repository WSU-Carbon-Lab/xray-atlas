import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { deriveDefaultPasskeyNickname } from "~/lib/passkey-nickname";

type ExpectAssertions = { toBe: (expected: unknown) => void };
const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

describe("deriveDefaultPasskeyNickname", () => {
  it("combines browser and platform", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
    expect(deriveDefaultPasskeyNickname(ua, "singleDevice")).toBe(
      "Safari on Mac",
    );
  });

  it("recognizes iPhone Chrome", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/119.0.0.0 Mobile/15E148 Safari/604.1";
    expect(deriveDefaultPasskeyNickname(ua, "multiDevice")).toBe(
      "Chrome on iPhone",
    );
  });

  it("falls back to a device-type label when the UA is unrecognized", () => {
    expect(deriveDefaultPasskeyNickname("", "multiDevice")).toBe(
      "Synced passkey",
    );
    expect(deriveDefaultPasskeyNickname(null, "singleDevice")).toBe("Passkey");
  });

  it("recognizes desktop Edge (Edg/) without misreading it as Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(deriveDefaultPasskeyNickname(ua, "singleDevice")).toBe(
      "Edge on Windows PC",
    );
  });

  it("recognizes Android Edge (EdgA/), a suffix the naive Edg/ pattern misses", () => {
    const ua =
      "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Mobile Safari/537.36 EdgA/91.0.864.59";
    expect(deriveDefaultPasskeyNickname(ua, "multiDevice")).toBe(
      "Edge on Android",
    );
  });

  it("recognizes iOS Edge (EdgiOS/), a suffix the naive Edg/ pattern misses", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 EdgiOS/46.3.11 Mobile/15E148 Safari/604.1";
    expect(deriveDefaultPasskeyNickname(ua, "multiDevice")).toBe(
      "Edge on iPhone",
    );
  });

  it("recognizes iOS Opera (OPiOS/), a suffix the naive OPR/ pattern misses", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 OPiOS/62.2.3043.59504 Mobile/15E148 Safari/604.1";
    expect(deriveDefaultPasskeyNickname(ua, "multiDevice")).toBe(
      "Opera on iPhone",
    );
  });

  it("recognizes desktop Opera (OPR/) on Windows", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
    expect(deriveDefaultPasskeyNickname(ua, "singleDevice")).toBe(
      "Opera on Windows PC",
    );
  });
});
