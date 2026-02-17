export type FacilityTypeValue =
  | "SYNCHROTRON"
  | "FREE_ELECTRON_LASER"
  | "LAB_SOURCE";

export interface FacilityInstrumentInput {
  name?: string | null;
  link?: string | null;
  status?: string | null;
}

export interface FacilityJsonInput {
  name?: string | null;
  city?: string | null;
  country?: string | null;
  facilityType?: string | null;
  facility_type?: string | null;
  instruments?: FacilityInstrumentInput[] | null;
}

export interface ParsedFacilityInstrument {
  name: string;
  link: string;
  status: "active" | "inactive" | "under_maintenance";
}

export interface ParsedFacilityData {
  name: string;
  city: string;
  country: string;
  facilityType: FacilityTypeValue;
  instruments: ParsedFacilityInstrument[];
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const VALID_FACILITY_TYPES: FacilityTypeValue[] = [
  "SYNCHROTRON",
  "FREE_ELECTRON_LASER",
  "LAB_SOURCE",
];

function parseFacilityType(v: unknown): FacilityTypeValue {
  const s = str(v).toUpperCase().replace(/-/g, "_");
  if (VALID_FACILITY_TYPES.includes(s as FacilityTypeValue)) {
    return s as FacilityTypeValue;
  }
  return "LAB_SOURCE";
}

function parseInstrumentStatus(
  v: unknown,
): "active" | "inactive" | "under_maintenance" {
  const s = str(v).toLowerCase().replace(/-/g, "_");
  if (s === "inactive") return "inactive";
  if (s === "under_maintenance" || s === "under maintenance")
    return "under_maintenance";
  return "active";
}

export function parseFacilityJson(json: unknown): ParsedFacilityData {
  const raw = json as FacilityJsonInput | null;
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON must be an object");
  }

  const name = str(raw.name) || "";
  const city = str(raw.city) ?? "";
  const country = str(raw.country) ?? "";
  const facilityType = parseFacilityType(
    raw.facilityType ?? raw.facility_type ?? "LAB_SOURCE",
  );

  const rawInstruments = raw.instruments;
  const instruments: ParsedFacilityInstrument[] = Array.isArray(rawInstruments)
    ? rawInstruments
        .filter(
          (item): item is FacilityInstrumentInput =>
            item != null && typeof item === "object",
        )
        .map((item) => {
          const nameStr = str(item.name) || "";
          return {
            name: nameStr,
            link: str(item.link) ?? "",
            status: parseInstrumentStatus(item.status),
          };
        })
        .filter((inst) => inst.name.length > 0)
    : [];

  return {
    name,
    city,
    country,
    facilityType,
    instruments,
  };
}

export function parseFacilityJsonFile(file: File): Promise<ParsedFacilityData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        if (typeof text !== "string") {
          reject(new Error("Failed to read file as text"));
          return;
        }
        const json = JSON.parse(text) as unknown;
        resolve(parseFacilityJson(json));
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error("Failed to parse JSON file"),
        );
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
