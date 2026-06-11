import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  createLookupRequestGeneration,
  resolveLookupGeneration,
} from "./lookup-request-generation";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("createLookupRequestGeneration", () => {
  it("only the latest generation is current after overlapping lookups", () => {
    const guard = createLookupRequestGeneration();
    const first = guard.next();
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it("reuses an in-flight generation for nested lookup steps", () => {
    const guard = createLookupRequestGeneration();
    const parent = guard.next();
    const nested = resolveLookupGeneration(guard, parent);
    expect(nested).toBe(parent);
    expect(guard.isCurrent(parent)).toBe(true);
    const sibling = guard.next();
    expect(guard.isCurrent(parent)).toBe(false);
    expect(guard.isCurrent(sibling)).toBe(true);
  });
});
