import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  WIDE_PAIRED_UPLOAD_COLUMNS,
  pairWidePairedGeometryColumns,
  parseWidePairedColumnHeader,
  parseWidePairedSheetName,
  parsedFilenameFromWidePairedSemantics,
  moleculeTokenFromWidePairedWorkbookName,
  unpivotWidePairedRowsToUploadFormat,
} from "./wide-paired-xlsx-semantics";

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

describe("parseWidePairedSheetName", () => {
  it("parses N2200 C K edge sheet semantics for ANSTO SXR", () => {
    expect(parseWidePairedSheetName("N2200_C_K_edge_TEY_ANSTO_SXR")).toEqual({
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

  it("parses facility and beamline tokens for another instrument pattern", () => {
    expect(parseWidePairedSheetName("ZnPc_C_K_edge_TEY_ALS_5322")).toEqual({
      molecule: "ZnPc",
      targetAtom: "C",
      coreState: "K",
      edgeLabel: "C(K)",
      technique: "TEY",
      facility: "ALS",
      beamline: "5322",
      baseToken: "ZnPc_C_K_edge_TEY_ALS_5322",
    });
  });

  it("rejects labels that omit edge, technique, or beamline", () => {
    expect(parseWidePairedSheetName("")).toBeNull();
    expect(parseWidePairedSheetName("ScanID103834")).toBeNull();
    expect(parseWidePairedSheetName("N2200_C_K_TEY_ANSTO_SXR")).toBeNull();
    expect(parseWidePairedSheetName("N2200_C_K_edge_TEY_ANSTO")).toBeNull();
  });
});

describe("parseWidePairedColumnHeader", () => {
  it("parses energy and absorption paired headers", () => {
    expect(
      parseWidePairedColumnHeader("N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En"),
    ).toEqual({
      baseToken: "N2200_C_K_edge_TEY_ANSTO_SXR",
      thetaDegrees: 30,
      channel: "energy",
    });
    expect(
      parseWidePairedColumnHeader("N2200_C_K_edge_TEY_ANSTO_SXR_30deg"),
    ).toEqual({
      baseToken: "N2200_C_K_edge_TEY_ANSTO_SXR",
      thetaDegrees: 30,
      channel: "absorption",
    });
  });
});

describe("pairWidePairedGeometryColumns", () => {
  it("pairs columns and sorts by theta", () => {
    const pairs = pairWidePairedGeometryColumns(
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

  it("pairs columns for a non-ANSTO facility beamline base token", () => {
    const pairs = pairWidePairedGeometryColumns(
      [
        "ZnPc_C_K_edge_TEY_ALS_5322_55deg_En",
        "ZnPc_C_K_edge_TEY_ALS_5322_55deg",
        "ZnPc_C_K_edge_TEY_ALS_5322_20deg_En",
        "ZnPc_C_K_edge_TEY_ALS_5322_20deg",
      ],
      "ZnPc_C_K_edge_TEY_ALS_5322",
    );
    expect(pairs).toHaveLength(2);
    expect(pairs[0]?.thetaDegrees).toBe(20);
    expect(pairs[1]?.thetaDegrees).toBe(55);
  });

  it("drops unpaired energy columns", () => {
    const pairs = pairWidePairedGeometryColumns(
      ["N2200_C_K_edge_TEY_ANSTO_SXR_20deg_En"],
      "N2200_C_K_edge_TEY_ANSTO_SXR",
    );
    expect(pairs).toHaveLength(0);
  });
});

describe("unpivotWidePairedRowsToUploadFormat", () => {
  it("coerces wide rows into energy/mu/theta upload records", () => {
    const pairs = pairWidePairedGeometryColumns(
      [
        "N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En",
        "N2200_C_K_edge_TEY_ANSTO_SXR_30deg",
      ],
      "N2200_C_K_edge_TEY_ANSTO_SXR",
    );
    const rows = unpivotWidePairedRowsToUploadFormat(
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
        [WIDE_PAIRED_UPLOAD_COLUMNS.energy]: 280.1,
        [WIDE_PAIRED_UPLOAD_COLUMNS.absorption]: 0.42,
        [WIDE_PAIRED_UPLOAD_COLUMNS.theta]: 30,
      },
    ]);
  });
});

describe("parsedFilenameFromWidePairedSemantics", () => {
  it("maps ANSTO sheet semantics to contribute filename tokens", () => {
    const semantics = parseWidePairedSheetName("N2200_N_K_edge_TEY_ANSTO_SXR");
    expect(semantics).not.toBeNull();
    expect(parsedFilenameFromWidePairedSemantics(semantics!, "N2200")).toEqual({
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

  it("maps ALS facility and beamline tokens through normalizeFacilityToken", () => {
    const semantics = parseWidePairedSheetName("ZnPc_C_K_edge_TEY_ALS_5322");
    expect(semantics).not.toBeNull();
    expect(parsedFilenameFromWidePairedSemantics(semantics!)).toEqual({
      edge: "C(K)",
      experimentMode: "TEY",
      facility: "Advanced Light Source",
      beamline: "5322",
      experimenter: null,
      vendorSlug: null,
      extraInfo: null,
      moleculeToken: "ZnPc",
    });
  });
});

describe("moleculeTokenFromWidePairedWorkbookName", () => {
  it("strips trailing numeric workbook suffixes", () => {
    expect(moleculeTokenFromWidePairedWorkbookName("N2200 1.xlsx")).toBe(
      "N2200",
    );
  });
});
