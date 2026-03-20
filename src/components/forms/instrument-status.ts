import type { InstrumentFormData, RegisteredInstrumentStatusPresentation } from "./types";

export function parseInstrumentStatus(s: string): InstrumentFormData["status"] {
  if (s === "inactive" || s === "under_maintenance" || s === "active") {
    return s;
  }
  return "active";
}

export function registeredInstrumentStatusPresentation(
  status: string,
): RegisteredInstrumentStatusPresentation {
  const s = parseInstrumentStatus(status);
  switch (s) {
    case "inactive":
      return { label: "Inactive", chipColor: "default" };
    case "under_maintenance":
      return { label: "Under maintenance", chipColor: "warning" };
    default:
      return { label: "Active", chipColor: "success" };
  }
}
