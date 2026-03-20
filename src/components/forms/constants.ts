import type { InstrumentStatus } from "./types";

export const INSTRUMENT_STATUS_OPTIONS = [
  { value: "active" satisfies InstrumentStatus, label: "Active" },
  { value: "inactive" satisfies InstrumentStatus, label: "Inactive" },
  { value: "under_maintenance" satisfies InstrumentStatus, label: "Under Maintenance" },
] satisfies ReadonlyArray<{ value: InstrumentStatus; label: string }>;

