import type {
  StxmDirectoryHandle,
  StxmFileSystemDirectoryHandle,
  StxmFileSystemFileHandle,
} from "./fileSystemAccessTypes";
import { stxmWindow } from "./fileSystemAccessTypes";

export type { StxmDirectoryHandle };

export type StxmFileRef = {
  name: string;
  relativePath: string;
  handle: StxmFileSystemFileHandle;
};

/**
 * Returns true when the File System Access directory picker is available.
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Opens the native directory picker; throws when unsupported or dismissed.
 */
export async function pickStxmRootDirectory(): Promise<StxmDirectoryHandle> {
  if (!isDirectoryPickerSupported()) {
    throw new Error(
      "Folder selection requires a Chromium-based browser with File System Access API support.",
    );
  }
  const picker = stxmWindow().showDirectoryPicker;
  if (!picker) {
    throw new Error("Directory picker is unavailable in this browser.");
  }
  return picker({ mode: "read" });
}

/**
 * Recursively collects `.hdr` file handles under a directory handle.
 */
export async function collectHdrFileRefs(
  directory: StxmDirectoryHandle,
  prefix = "",
): Promise<StxmFileRef[]> {
  const refs: StxmFileRef[] = [];
  for await (const [name, handle] of directory.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "file" && name.toLowerCase().endsWith(".hdr")) {
      refs.push({ name, relativePath, handle: handle as StxmFileSystemFileHandle });
    } else if (handle.kind === "directory") {
      refs.push(
        ...(await collectHdrFileRefs(
          handle as StxmFileSystemDirectoryHandle,
          relativePath,
        )),
      );
    }
  }
  return refs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Lists immediate child directory names under a root handle.
 */
export async function listChildDirectoryNames(
  directory: StxmDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === "directory") {
      names.push(name);
    }
  }
  return names;
}

/**
 * Returns true when at least one `.hdr` file exists under `directory` (search stops after the first hit).
 */
export async function directoryHasHdrFiles(
  directory: StxmDirectoryHandle,
): Promise<boolean> {
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === "file" && name.toLowerCase().endsWith(".hdr")) {
      return true;
    }
    if (handle.kind === "directory") {
      const nested = await directoryHasHdrFiles(
        handle as StxmFileSystemDirectoryHandle,
      );
      if (nested) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Counts `.hdr` files under `directory` without reading file contents.
 */
export async function countHdrFilesInDirectory(
  directory: StxmDirectoryHandle,
): Promise<number> {
  let count = 0;
  for await (const [name, handle] of directory.entries()) {
    if (handle.kind === "file" && name.toLowerCase().endsWith(".hdr")) {
      count += 1;
    } else if (handle.kind === "directory") {
      count += await countHdrFilesInDirectory(
        handle as StxmFileSystemDirectoryHandle,
      );
    }
  }
  return count;
}

/**
 * Finds a sibling `.xim` file for a `.hdr` basename within the same directory tree leaf folder.
 */
export async function findXimFileForHdr(
  hdrRef: StxmFileRef,
  ximBasenames: string[],
  root: StxmDirectoryHandle,
): Promise<StxmFileSystemFileHandle | null> {
  const parts = hdrRef.relativePath.split("/");
  parts.pop();
  let directory = root;
  for (const segment of parts) {
    directory = await directory.getDirectoryHandle(segment);
  }
  for (const candidate of ximBasenames) {
    try {
      return await directory.getFileHandle(candidate);
    } catch {
      continue;
    }
  }
  return null;
}
