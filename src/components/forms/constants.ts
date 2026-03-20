import type { FacilityType, InstrumentStatus } from "./types";

export const INSTRUMENT_STATUS_OPTIONS = [
  { value: "active" satisfies InstrumentStatus, label: "Active" },
  { value: "inactive" satisfies InstrumentStatus, label: "Inactive" },
  { value: "under_maintenance" satisfies InstrumentStatus, label: "Under Maintenance" },
] satisfies ReadonlyArray<{ value: InstrumentStatus; label: string }>;

export const FACILITY_TYPE_OPTIONS = [
  { id: "LAB_SOURCE" satisfies FacilityType, label: "Lab Source" },
  { id: "SYNCHROTRON" satisfies FacilityType, label: "Synchrotron" },
  { id: "FREE_ELECTRON_LASER" satisfies FacilityType, label: "Free Electron Laser" },
] as const satisfies ReadonlyArray<{ id: FacilityType; label: string }>;
