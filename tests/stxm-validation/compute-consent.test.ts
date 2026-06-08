import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  grantStxmComputeConsent,
  readStxmComputeConsentGranted,
} from "~/lib/stxm/compute-consent";
import { readKkBrowserConsentGranted } from "~/features/kk-calc/browser-consent";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("stxm compute consent", () => {
  it("grants STXM and KK browser consent in sessionStorage", () => {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    sessionStorage.clear();
    expect(readStxmComputeConsentGranted()).toBe(false);
    expect(readKkBrowserConsentGranted()).toBe(false);
    grantStxmComputeConsent();
    expect(readStxmComputeConsentGranted()).toBe(true);
    expect(readKkBrowserConsentGranted()).toBe(true);
    sessionStorage.clear();
  });
});
