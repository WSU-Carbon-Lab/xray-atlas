import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { createEmptyStxmSessionFile } from "~/features/dashboard/lib/stxm-session-file";
import { resolveStxmSessionForMutation } from "./use-stxm-session-file";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const experimentName = "2024-03-AuNP";

describe("resolveStxmSessionForMutation", () => {
  it("returns null while the session file is not ready", () => {
    const loaded = createEmptyStxmSessionFile(experimentName);
    expect(resolveStxmSessionForMutation(false, loaded, experimentName)).toBeNull();
    expect(resolveStxmSessionForMutation(false, null, experimentName)).toBeNull();
  });

  it("reuses the loaded session snapshot when ready", () => {
    const loaded = createEmptyStxmSessionFile(experimentName);
    expect(resolveStxmSessionForMutation(true, loaded, experimentName)).toEqual(
      loaded,
    );
  });

  it("creates an empty session only after the initial read completes", () => {
    const created = resolveStxmSessionForMutation(true, null, experimentName);
    expect(created).toEqual(createEmptyStxmSessionFile(experimentName));
  });

  it("returns null when ready but no experiment name is bound", () => {
    expect(resolveStxmSessionForMutation(true, null, null)).toBeNull();
    expect(resolveStxmSessionForMutation(true, null, "   ")).toBeNull();
  });
});
