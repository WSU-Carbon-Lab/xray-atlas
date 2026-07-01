import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { kkDeltaSubmitValidationErrors } from "./kkDeltaSubmitValidation";

type ExpectAssertions = {
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("kkDeltaSubmitValidationErrors", () => {
  it("returns no errors when KK at upload is not requested", () => {
    expect(kkDeltaSubmitValidationErrors(false, [])).toEqual([]);
    expect(
      kkDeltaSubmitValidationErrors(undefined, [{ beta: 1, delta: 0.1 }]),
    ).toEqual([]);
  });

  it("requires finite delta and beta on every point when KK at upload is requested", () => {
    expect(kkDeltaSubmitValidationErrors(true, [])).toEqual([
      "computeKkDeltaOnSubmit requires finite delta on at least one spectrum point",
      "computeKkDeltaOnSubmit requires finite beta on every spectrum point",
    ]);
    expect(
      kkDeltaSubmitValidationErrors(true, [
        { beta: 1, delta: 0.1 },
        { delta: 0.2 },
      ]),
    ).toEqual([
      "computeKkDeltaOnSubmit requires finite beta on every spectrum point",
    ]);
  });

  it("accepts derived beta without beta in uploadedChannels metadata", () => {
    expect(
      kkDeltaSubmitValidationErrors(true, [
        { beta: 0.01, delta: 1e-4 },
        { beta: 0.02, delta: 2e-4 },
      ]),
    ).toEqual([]);
  });
});
