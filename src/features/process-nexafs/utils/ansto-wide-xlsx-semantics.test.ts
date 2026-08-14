import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  ANSTO_WIDE_UPLOAD_COLUMNS,
  pairAnstoWideGeometryColumns,
  parseAnstoWideColumnHeader,
  parseAnstoWideSheetName,
  parsedFilenameFromAnstoWideSemantics,
  moleculeTokenFromAnstoWideWorkbookName,
  unpivotAnstoWideRowsToUploadFormat,
} from "./ansto-wide-xlsx-semantics";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeNull: () => void;
  toEqual: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
  not: { toBeNull: () => void };
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("parseAnstoWideSheetName", () => {
  it("parses N2200 C K edge sheet semantics", () => {
    expect(parseAnstoWideSheetName("N2200_C_K_edge_TEY_ANSTO_SXR")).toEqual({
      molecule: "N2200",
      targetAtom: "C",
      coreState: "K",
      edgeLabel: "C(K)",
      technique: "TEY",
      facility: "ANSTO",
      beamline: "SXR",
      baseToken: "N2200_C_K_edge_TEY_ANSTO_SXR",
    });
  });

  it("rejects labels that omit edge, technique, or beamline", () => {
    expect(parseAnstoWideSheetName("")).toBeNull();
    expect(parseAnstoWideSheetName("ScanID103834")).toBeNull();
    expect(parseAnstoWideSheetName("N2200_C_K_TEY_ANSTO_SXR")).toBeNull();
    expect(parseAnstoWideSheetName("N2200_C_K_edge_TEY_ANSTO")).toBeNull();
  });
});

describe("parseAnstoWideColumnHeader", () => {
  it("parses energy and absorption paired headers", () => {
    expect(
      parseAnstoWideColumnHeader("N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En"),
    ).toEqual({
      baseToken: "N2200_C_K_edge_TEY_ANSTO_SXR",
      thetaDegrees: 30,
      channel: "energy",
    });
    expect(
      parseAnstoWideColumnHeader("N2200_C_K_edge_TEY_ANSTO_SXR_30deg"),
    ).toEqual({
      baseToken: "N2200_C_K_edge_TEY_ANSTO_SXR",
      thetaDegrees: 30,
      channel: "absorption",
    });
  });
});

describe("pairAnstoWideGeometryColumns", () => {
  it("pairs columns and sorts by theta", () => {
    const pairs = pairAnstoWideGeometryColumns(
      [
        "N2200_C_K_edge_TEY_ANSTO_SXR_55deg_En",
        "N2200_C_K_edge_TEY_ANSTO_SXR_55deg",
        "N2200_C_K_edge_TEY_ANSTO_SXR_20deg_En",
        "N2200_C_K_edge_TEY_ANSTO_SXR_20deg",
      ],
      "N2200_C_K_edge_TEY_ANSTO_SXR",
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.thetaDegrees).toBe(20);
    expect(pairs[1]?.thetaDegrees).toBe(55);
  });

  it("drops unpaired energy columns", () => {
    const pairs = pairAnstoWideGeometryColumns(
      ["N2200_C_K_edge_TEY_ANSTO_SXR_20deg_En"],
      "N2200_C_K_edge_TEY_ANSTO_SXR",
    );
    expect(pairs).toHaveLength(0);
  });
});

describe("unpivotAnstoWideRowsToUploadFormat", () => {
  it("coerces wide rows into energy/mu/theta upload records", () => {
    const pairs = pairAnstoWideGeometryColumns(
      [
        "N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En",
        "N2200_C_K_edge_TEY_ANSTO_SXR_30deg",
      ],
      "N2200_C_K_edge_TEY_ANSTO_SXR",
    );
    const rows = unpivotAnstoWideRowsToUploadFormat(
      [
        {
          "N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En": 280.1,
          "N2200_C_K_edge_TEY_ANSTO_SXR_30deg": 0.42,
        },
      ],
      pairs,
    );
    expect(rows).toEqual([
      {
        [ANSTO_WIDE_UPLOAD_COLUMNS.energy]: 280.1,
        [ANSTO_WIDE_UPLOAD_COLUMNS.absorption]: 0.42,
        [ANSTO_WIDE_UPLOAD_COLUMNS.theta]: 30,
      },
    ]);
  });
});

describe("parsedFilenameFromAnstoWideSemantics", () => {
  it("maps sheet semantics to contribute filename tokens", () => {
    const semantics = parseAnstoWideSheetName("N2200_N_K_edge_TEY_ANSTO_SXR");
    expect(semantics).not.toBeNull();
    expect(parsedFilenameFromAnstoWideSemantics(semantics!, "N2200")).toEqual({
      edge: "N(K)",
      experimentMode: "TEY",
      facility: "The Australian Synchrotron",
      beamline: "SXR",
      experimenter: null,
      vendorSlug: null,
      extraInfo: null,
      moleculeToken: "N2200",
    });
  });
});

describe("moleculeTokenFromAnstoWideWorkbookName", () => {
  it("strips trailing numeric workbook suffixes", () => {
    expect(moleculeTokenFromAnstoWideWorkbookName("N2200 1.xlsx")).toBe(
      "N2200",
    );
  });
});
