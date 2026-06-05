import type { StxmDirectoryHandle } from "./fileSystemAccessTypes";

const RECENT_FOLDERS_KEY = "xray-atlas:stxm-recent-folders:v1";
const DB_NAME = "xray-atlas-stxm";
const DB_VERSION = 1;
const HANDLE_STORE = "directory-handles";

export type RecentStxmFolder = {
  handleKey: string;
  displayName: string;
  lastOpenedAt: string;
};

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

/** Loads versioned recent folder records from sessionStorage. */
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
    return Array.isArray(parsed) ? parsed : [];
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
    sessionStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(folders.slice(0, 8)));
  } catch {
    // quota or private mode
  }
}

/**
 * Promotes a folder to the front of the recent list and returns the updated array.
 */
export function touchRecentFolder(
  handleKey: string,
  displayName: string,
): RecentStxmFolder[] {
  const now = new Date().toISOString();
  const existing = loadRecentFolders().filter((row) => row.handleKey !== handleKey);
  const next: RecentStxmFolder[] = [
    { handleKey, displayName, lastOpenedAt: now },
    ...existing,
  ].slice(0, 8);
  saveRecentFolders(next);
  return next;
}

/**
 * Requests read permission on a stored handle when the browser requires re-authorization.
 */
export async function ensureDirectoryReadPermission(
  handle: StxmDirectoryHandle,
): Promise<boolean> {
  if (!handle.queryPermission) {
    return true;
  }
  const current = await handle.queryPermission({ mode: "read" });
  if (current === "granted") {
    return true;
  }
  if (!handle.requestPermission) {
    return false;
  }
  const requested = await handle.requestPermission({ mode: "read" });
  return requested === "granted";
}
