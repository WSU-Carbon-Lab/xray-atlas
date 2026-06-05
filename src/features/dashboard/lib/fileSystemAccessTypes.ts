/**
 * Minimal File System Access API typings for browser folder browsing.
 * Chromium implements these interfaces; DOM lib typings may omit picker helpers.
 */

export interface StxmDirectoryPickerOptions {
  mode?: "read" | "readwrite";
}

export interface StxmDirectoryPermissionDescriptor {
  mode: "read" | "readwrite";
}

export interface StxmFileSystemHandle {
  kind: "file" | "directory";
  name: string;
}

export interface StxmFileSystemFileHandle extends StxmFileSystemHandle {
  kind: "file";
  getFile(): Promise<File>;
}

export interface StxmFileSystemDirectoryHandle extends StxmFileSystemHandle {
  kind: "directory";
  entries(): AsyncIterableIterator<[string, StxmFileSystemHandle]>;
  getDirectoryHandle(name: string): Promise<StxmFileSystemDirectoryHandle>;
  getFileHandle(name: string): Promise<StxmFileSystemFileHandle>;
  queryPermission?(
    descriptor: StxmDirectoryPermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission?(
    descriptor: StxmDirectoryPermissionDescriptor,
  ): Promise<PermissionState>;
}

export interface StxmWindowWithDirectoryPicker extends Window {
  showDirectoryPicker?: (
    options?: StxmDirectoryPickerOptions,
  ) => Promise<StxmFileSystemDirectoryHandle>;
}

export type StxmDirectoryHandle = StxmFileSystemDirectoryHandle;

export function stxmWindow(): StxmWindowWithDirectoryPicker {
  return window as StxmWindowWithDirectoryPicker;
}
