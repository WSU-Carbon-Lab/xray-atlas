import Papa from "papaparse";
import type {
  ParsedFacilityData,
  ParsedFacilityInstrument,
  FacilityTypeValue,
} from "./parse-facility-json";

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "facility", "facility name", "facilityname"],
  city: ["city", "city name"],
  country: ["country", "country name"],
  facilityType: ["facilitytype", "facility_type", "type", "facility type"],
  instruments: [
    "instruments",
    "instrument",
    "instrument names",
    "instrument_names",
    "beamlines",
  ],
};

const VALID_FACILITY_TYPES: FacilityTypeValue[] = [
  "SYNCHROTRON",
  "FREE_ELECTRON_LASER",
  "LAB_SOURCE",
];

function findColumnKey(
  headers: string[],
  targetKey: keyof typeof COLUMN_ALIASES,
): string | null {
  const normalized = targetKey.toLowerCase().trim();
  const aliases = COLUMN_ALIASES[targetKey];
  if (!aliases) return null;
  for (const header of headers) {
    const h = header.toLowerCase().trim();
    if (h === normalized || aliases.includes(h)) return header;
  }
  return null;
}

function getCell(row: Record<string, unknown>, key: string | null): string {
  if (!key || row[key] == null) return "";
  const v = row[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}

function parseFacilityType(v: string): FacilityTypeValue {
  const s = v.toUpperCase().replace(/-/g, "_");
  if (VALID_FACILITY_TYPES.includes(s as FacilityTypeValue)) {
    return s as FacilityTypeValue;
  }
  return "LAB_SOURCE";
}

function parseInstrumentsFromCell(value: string): ParsedFacilityInstrument[] {
  if (!value.trim()) return [];
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      link: "",
      status: "active" as const,
    }));
}

export function parseFacilityCsvFile(file: File): Promise<ParsedFacilityData> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          const headers =
            results.meta.fields ??
            (rows[0] ? Object.keys(rows[0]) : []);
          if (!rows.length) {
            reject(new Error("CSV has no data rows"));
            return;
          }
          const firstRow = rows[0]!;
          const nameKey = findColumnKey(headers, "name");
          const cityKey = findColumnKey(headers, "city");
          const countryKey = findColumnKey(headers, "country");
          const facilityTypeKey = findColumnKey(headers, "facilityType");
          const instrumentsKey = findColumnKey(headers, "instruments");

          const name = getCell(firstRow, nameKey);
          const city = getCell(firstRow, cityKey);
          const country = getCell(firstRow, countryKey);
          const facilityTypeRaw = getCell(firstRow, facilityTypeKey);
          const facilityType = facilityTypeRaw
            ? parseFacilityType(facilityTypeRaw)
            : "LAB_SOURCE";
          const instrumentsCell = getCell(firstRow, instrumentsKey);
          const instruments = instrumentsCell
            ? parseInstrumentsFromCell(instrumentsCell)
            : [];

          resolve({
            name,
            city,
            country,
            facilityType,
            instruments,
          });
        } catch (err) {
          reject(
            err instanceof Error ? err : new Error("Failed to parse CSV file"),
          );
        }
      },
      error: (err) => {
        reject(
          err?.message
            ? new Error(err.message)
            : new Error("Failed to read CSV file"),
        );
      },
    });
  });
}
