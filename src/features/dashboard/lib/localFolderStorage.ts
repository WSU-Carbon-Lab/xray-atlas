import type { StxmDirectoryHandle } from "./fileSystemAccessTypes";

const RECENT_FOLDERS_KEY = "xray-atlas:stxm-recent-folders:v1";
const DB_NAME = "xray-atlas-stxm";
const DB_VERSION = 1;
const HANDLE_STORE = "directory-handles";

/** Maximum recent folders shown in the workspace picker. */
export const RECENT_FOLDERS_MAX = 5;

export type RecentStxmFolder = {
  handleKey: string;
  displayName: string;
  lastOpenedAt: string;
};

export type DirectoryReadPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/**
 * Normalizes a folder display name for stable deduplication across sessions.
 */
export function normalizeRecentFolderDisplayName(displayName: string): string {
  return displayName.trim().toLowerCase();
}

/**
 * Collapses duplicate recent folders by normalized display name, keeping the newest row.
 */
export function dedupeRecentFolders(
  folders: RecentStxmFolder[],
  max = RECENT_FOLDERS_MAX,
): RecentStxmFolder[] {
  const seenDisplayNames = new Set<string>();
  const seenHandleKeys = new Set<string>();
  const out: RecentStxmFolder[] = [];
  for (const folder of folders) {
    const normalizedName = normalizeRecentFolderDisplayName(folder.displayName);
    if (
      seenDisplayNames.has(normalizedName) ||
      seenHandleKeys.has(folder.handleKey)
    ) {
      continue;
    }
    seenDisplayNames.add(normalizedName);
    seenHandleKeys.add(folder.handleKey);
    out.push(folder);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function openDirectoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

/**
 * Persists a directory handle for later reload within the same browser profile.
 */
export async function storeDirectoryHandle(
  key: string,
  handle: StxmDirectoryHandle,
): Promise<void> {
  const db = await openDirectoryDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).put(handle, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
  db.close();
}

/**
 * Reads a previously stored directory handle, or null when absent.
 */
export async function loadDirectoryHandle(
  key: string,
): Promise<StxmDirectoryHandle | null> {
  const db = await openDirectoryDb();
  const handle = await new Promise<StxmDirectoryHandle | null>(
    (resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, "readonly");
      const request = tx.objectStore(HANDLE_STORE).get(key);
      request.onsuccess = () => {
        resolve((request.result as StxmDirectoryHandle | undefined) ?? null);
      };
      request.onerror = () =>
        reject(request.error ?? new Error("IndexedDB read failed"));
    },
  );
  db.close();
  return handle;
}

/** Loads versioned recent folder records from sessionStorage with deduplication applied. */
export function loadRecentFolders(): RecentStxmFolder[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(RECENT_FOLDERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentStxmFolder[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return dedupeRecentFolders(parsed);
  } catch {
    return [];
  }
}

/** Saves recent folder records to sessionStorage. */
export function saveRecentFolders(folders: RecentStxmFolder[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(
      RECENT_FOLDERS_KEY,
      JSON.stringify(dedupeRecentFolders(folders)),
    );
  } catch {
    // quota or private mode
  }
}

/**
 * Returns an existing handle key when the same display name was opened before.
 */
export function findRecentFolderHandleKey(displayName: string): string | null {
  const normalized = normalizeRecentFolderDisplayName(displayName);
  const match = loadRecentFolders().find(
    (row) => normalizeRecentFolderDisplayName(row.displayName) === normalized,
  );
  return match?.handleKey ?? null;
}

/**
 * Resolves a stable handle key for a folder, reusing a prior key when the display name matches.
 */
export function resolveFolderHandleKey(
  displayName: string,
  proposedKey?: string,
): string {
  return (
    findRecentFolderHandleKey(displayName) ??
    proposedKey ??
    crypto.randomUUID()
  );
}

/**
 * Promotes a folder to the front of the recent list and returns the deduplicated array.
 */
export function touchRecentFolder(
  handleKey: string,
  displayName: string,
): RecentStxmFolder[] {
  const now = new Date().toISOString();
  const normalized = normalizeRecentFolderDisplayName(displayName);
  const existing = loadRecentFolders().filter(
    (row) =>
      row.handleKey !== handleKey &&
      normalizeRecentFolderDisplayName(row.displayName) !== normalized,
  );
  const next: RecentStxmFolder[] = dedupeRecentFolders([
    { handleKey, displayName, lastOpenedAt: now },
    ...existing,
  ]);
  saveRecentFolders(next);
  return next;
}

/**
 * Queries read permission without prompting. Safe to call on mount or reload checks.
 */
export async function queryDirectoryReadPermission(
  handle: StxmDirectoryHandle,
): Promise<DirectoryReadPermissionState> {
  if (!handle.queryPermission) {
    return "unsupported";
  }
  const state = await handle.queryPermission({ mode: "read" });
  if (state === "granted") {
    return "granted";
  }
  if (state === "denied") {
    return "denied";
  }
  return "prompt";
}

/**
 * Requests read permission; must only run inside a user activation handler (click).
 */
export async function requestDirectoryReadPermission(
  handle: StxmDirectoryHandle,
): Promise<boolean> {
  const queried = await queryDirectoryReadPermission(handle);
  if (queried === "granted" || queried === "unsupported") {
    return true;
  }
  if (!handle.requestPermission) {
    return false;
  }
  const requested = await handle.requestPermission({ mode: "read" });
  return requested === "granted";
}

/**
 * @deprecated Use {@link queryDirectoryReadPermission} or {@link requestDirectoryReadPermission}.
 */
export async function ensureDirectoryReadPermission(
  handle: StxmDirectoryHandle,
  options?: { allowRequest?: boolean },
): Promise<boolean> {
  const allowRequest = options?.allowRequest ?? false;
  const queried = await queryDirectoryReadPermission(handle);
  if (queried === "granted" || queried === "unsupported") {
    return true;
  }
  if (!allowRequest) {
    return false;
  }
  return requestDirectoryReadPermission(handle);
}
