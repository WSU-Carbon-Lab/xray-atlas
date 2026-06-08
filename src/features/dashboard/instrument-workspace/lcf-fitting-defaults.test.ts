import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { DashboardLcfStepMetadata } from "~/lib/dashboard-processing-session";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function resolveLcfChannel(metadata: DashboardLcfStepMetadata | undefined) {
  return metadata?.channel ?? "od";
}

describe("LCF fitting defaults", () => {
  it("defaults channel to raw od when metadata omits channel", () => {
    const metadata: DashboardLcfStepMetadata = {
      componentTraceKeys: [],
      sumToOne: true,
    };
    expect(resolveLcfChannel(metadata)).toBe("od");
    expect(resolveLcfChannel(undefined)).toBe("od");
  });
});
