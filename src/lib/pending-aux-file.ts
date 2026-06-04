import type { PendingAuxFile } from "~/features/process-nexafs/types";
import {
  validateAuxFileForScope,
  type AuxFileKind,
  type AuxFileScope,
} from "~/lib/aux-file-client";

/**
 * Builds a client-side pending aux upload row with a fresh `clientKey`.
 */
export function createPendingAuxFile(
  file: File,
  kind: AuxFileKind,
  description?: string,
): PendingAuxFile {
  const clientKey = crypto.randomUUID();
  return {
    id: clientKey,
    clientKey,
    file,
    kind,
    description: description?.trim() ? description.trim() : undefined,
  };
}

/**
 * Validates and appends dropped or picked files to an existing pending aux queue.
 */
export function appendPendingAuxFiles(
  existing: PendingAuxFile[],
  incoming: FileList | File[],
  scope: AuxFileScope,
  kind: AuxFileKind,
  description: string | undefined,
  onError?: (message: string) => void,
): PendingAuxFile[] {
  const list = Array.from(incoming);
  if (list.length === 0) {
    return existing;
  }

  const next = [...existing];
  for (const file of list) {
    const validation = validateAuxFileForScope(file, scope);
    if (!validation.ok) {
      onError?.(`${file.name}: ${validation.message}`);
      continue;
    }
    next.push(createPendingAuxFile(file, kind, description));
  }
  return next;
}
