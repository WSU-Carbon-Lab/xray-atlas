import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  hasPolymerBookendPair,
  validatePolymerStructureRequirement,
} from "./molecule-polymer-structure-validation";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("hasPolymerBookendPair", () => {
  it("requires both open and close marks", () => {
    expect(
      hasPolymerBookendPair({
        open: { atomA: 0, atomB: 1 },
        close: { atomA: 2, atomB: 3 },
      }),
    ).toBe(true);
    expect(
      hasPolymerBookendPair({
        open: { atomA: 0, atomB: 1 },
        close: null,
      }),
    ).toBe(false);
    expect(
      hasPolymerBookendPair({
        open: null,
        close: { atomA: 2, atomB: 3 },
      }),
    ).toBe(false);
  });
});

describe("validatePolymerStructureRequirement", () => {
  it("passes small molecules without structure extras", () => {
    expect(
      validatePolymerStructureRequirement(
        { compoundKind: "small_molecule", registryStub: false },
        { svgDataUrl: null },
      ).ok,
    ).toBe(true);
  });

  it("passes polymer registry stubs without depiction", () => {
    expect(
      validatePolymerStructureRequirement(
        { compoundKind: "polymer", registryStub: true },
        { svgDataUrl: null },
      ).ok,
    ).toBe(true);
  });

  it("passes polymer with SVG upload", () => {
    expect(
      validatePolymerStructureRequirement(
        { compoundKind: "polymer", registryStub: false },
        { svgDataUrl: "data:image/svg+xml;base64,PHN2Zy8+" },
      ).ok,
    ).toBe(true);
  });

  it("passes polymer with sketcher bookends", () => {
    expect(
      validatePolymerStructureRequirement(
        { compoundKind: "macromolecule", registryStub: false },
        {
          svgDataUrl: null,
          sketchState: {
            bookends: {
              open: { atomA: 0, atomB: 1 },
              close: { atomA: 4, atomB: 5 },
            },
          },
        },
      ).ok,
    ).toBe(true);
  });

  it("fails polymer without bookends or SVG", () => {
    expect(
      validatePolymerStructureRequirement(
        { compoundKind: "polymer", registryStub: false },
        { svgDataUrl: null },
      ).ok,
    ).toBe(false);
  });
});
