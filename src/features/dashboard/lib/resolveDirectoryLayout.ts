import {
  isExperimentFolderName,
  listBeamtimeExperimentFolders,
  sortExperimentFolderNames,
} from "~/lib/stxm";
import {
  directoryHasHdrFiles,
  listChildDirectoryNames,
  type StxmDirectoryHandle,
} from "./localDirectoryBrowser";

/** Sentinel when the picked directory itself is the experiment root. */
export const STXM_SINGLE_EXPERIMENT_TOKEN = ".";

export type StxmDirectoryLayout =
  | { mode: "multi-experiment"; experimentNames: string[] }
  | { mode: "single-experiment"; displayName: string };

/**
 * Pure layout classification from directory names and hdr presence (for tests and async resolver).
 */
export function resolveStxmDirectoryLayoutFromNames(
  rootName: string,
  childNames: string[],
  hasHdrFiles: boolean,
): StxmDirectoryLayout {
  const experimentNames = listBeamtimeExperimentFolders(childNames);
  if (experimentNames.length > 0 && childNames.some(isExperimentFolderName)) {
    return { mode: "multi-experiment", experimentNames };
  }
  if (isExperimentFolderName(rootName)) {
    return { mode: "single-experiment", displayName: rootName };
  }
  if (hasHdrFiles) {
    return { mode: "single-experiment", displayName: rootName };
  }
  return { mode: "multi-experiment", experimentNames: [] };
}

async function listHdrContainingChildNames(
  root: StxmDirectoryHandle,
  childNames: string[],
): Promise<string[]> {
  const matches: string[] = [];
  await Promise.all(
    childNames.map(async (name) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed.startsWith(".")) {
        return;
      }
      try {
        const child = await root.getDirectoryHandle(name);
        if (await directoryHasHdrFiles(child)) {
          matches.push(name);
        }
      } catch {
        // skip inaccessible children
      }
    }),
  );
  return sortExperimentFolderNames(matches);
}

/**
 * Classifies a picked directory as a beamtime root with month experiment children
 * or as a single experiment folder (month folder or flat scan tree).
 */
export async function resolveStxmDirectoryLayout(
  root: StxmDirectoryHandle,
): Promise<StxmDirectoryLayout> {
  const childNames = await listChildDirectoryNames(root);
  const experimentNames = listBeamtimeExperimentFolders(childNames);
  if (experimentNames.length > 0 && childNames.some(isExperimentFolderName)) {
    return { mode: "multi-experiment", experimentNames };
  }
  if (isExperimentFolderName(root.name)) {
    return { mode: "single-experiment", displayName: root.name };
  }
  const hdrChildren = await listHdrContainingChildNames(root, childNames);
  if (hdrChildren.length > 0) {
    return { mode: "multi-experiment", experimentNames: hdrChildren };
  }
  const hasHdr = await directoryHasHdrFiles(root);
  return resolveStxmDirectoryLayoutFromNames(root.name, childNames, hasHdr);
}

/**
 * Resolves the filesystem directory handle for an experiment card selection.
 */
export async function getExperimentDirectory(
  root: StxmDirectoryHandle,
  layout: StxmDirectoryLayout,
  experimentName: string,
): Promise<StxmDirectoryHandle> {
  if (layout.mode === "single-experiment") {
    return root;
  }
  if (
    experimentName === STXM_SINGLE_EXPERIMENT_TOKEN ||
    experimentName === root.name
  ) {
    return root;
  }
  return root.getDirectoryHandle(experimentName);
}
