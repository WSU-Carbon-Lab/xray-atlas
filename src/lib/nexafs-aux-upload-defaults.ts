import type { AuxFileKind } from "~/lib/aux-file-client";

type NexafsAuxUploadDefaults = {
  kind: AuxFileKind;
  description: string;
};

let nexafsAuxUploadDefaults: NexafsAuxUploadDefaults = {
  kind: "other",
  description: "",
};

/**
 * Updates shared aux upload defaults used by global drag-drop and compact drop zones.
 */
export function setNexafsAuxUploadDefaults(next: NexafsAuxUploadDefaults): void {
  nexafsAuxUploadDefaults = next;
}

/**
 * Reads the current shared aux upload defaults for global drag-drop queuing.
 */
export function getNexafsAuxUploadDefaults(): NexafsAuxUploadDefaults {
  return nexafsAuxUploadDefaults;
}
