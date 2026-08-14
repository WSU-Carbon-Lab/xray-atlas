import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import * as XLSX from "xlsx";
import { parseAnstoWideXlsxFile } from "./parseAnstoWideXlsx";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toHaveLength: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function workbookFile(
  fileName: string,
  sheets: ReadonlyArray<{ name: string; rows: Array<Array<string | number>> }>,
): File {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(sheet.rows),
      sheet.name,
    );
  }
  const written: unknown = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  });
  if (!(written instanceof ArrayBuffer) && !ArrayBuffer.isView(written)) {
    throw new Error("xlsx write did not return a binary buffer");
  }
  return new File([written], fileName, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("parseAnstoWideXlsxFile", () => {
  it("reads workbook sheets into long-format upload datasets", async () => {
    const file = workbookFile("N2200 1.xlsx", [
      {
        name: "N2200_C_K_edge_TEY_ANSTO_SXR",
        rows: [
          [
            "N2200_C_K_edge_TEY_ANSTO_SXR_20deg_En",
            "N2200_C_K_edge_TEY_ANSTO_SXR_20deg",
            "N2200_C_K_edge_TEY_ANSTO_SXR_30deg_En",
            "N2200_C_K_edge_TEY_ANSTO_SXR_30deg",
          ],
          [270.1, 0.12, 270.2, 0.13],
          [270.5, 0.15, 270.6, 0.16],
        ],
      },
    ]);
    const parsed = await parseAnstoWideXlsxFile(file);
    expect(parsed).toHaveLength(1);
    const sheet = parsed[0]!;
    expect(sheet.semantics.edgeLabel).toBe("C(K)");
    expect(sheet.columnMappings.energy).toBe("energy");
    expect(sheet.columnMappings.absorption).toBe("mu");
    expect(sheet.columnMappings.theta).toBe("theta");
    expect(sheet.geometryCount).toBe(2);
    expect(sheet.rowCount).toBe(4);
    expect(sheet.parsedFilename.moleculeToken).toBe("N2200");
    expect(sheet.parsedFilename.experimentMode).toBe("TEY");
    expect(sheet.parsedFilename.facility).toBe("The Australian Synchrotron");
    expect(sheet.experimentType).toBe("TOTAL_ELECTRON_YIELD");
    expect(sheet.displayFileName).toBe(
      "N2200 1 - N2200_C_K_edge_TEY_ANSTO_SXR.xlsx",
    );
  });

  it("rejects workbooks without ANSTO wide paired-column sheets", async () => {
    const file = workbookFile("scans.xlsx", [
      {
        name: "ScanID103834",
        rows: [
          ["Energy", "TEY"],
          [250, 0.1],
        ],
      },
    ]);
    let message = "";
    try {
      await parseAnstoWideXlsxFile(file);
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }
    expect(message.includes("No ANSTO wide paired-column sheets")).toBe(true);
  });
});
