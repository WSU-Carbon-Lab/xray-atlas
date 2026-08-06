/**
 * Collects files from a drag-and-drop `DataTransfer`, including nested files when
 * the user drops a folder. Uses the webkit directory entry API when available and
 * falls back to the flat `FileList`.
 *
 * Does not open File System Access pickers; that remains a separate user gesture.
 */

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryReaderLike = {
  readEntries: (
    successCallback: (entries: FileSystemEntryLike[]) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => FileSystemDirectoryReaderLike;
};

type DataTransferItemWithEntry = DataTransferItem & {
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
};

function readAllDirectoryEntries(
  reader: FileSystemDirectoryReaderLike,
): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntryLike[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readBatch();
        },
        (error) => reject(error),
      );
    };
    readBatch();
  });
}

function readFileEntry(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function collectFromEntry(entry: FileSystemEntryLike): Promise<File[]> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntryLike);
    return [file];
  }
  if (!entry.isDirectory) {
    return [];
  }
  const directory = entry as FileSystemDirectoryEntryLike;
  const reader = directory.createReader();
  const children = await readAllDirectoryEntries(reader);
  const nested = await Promise.all(children.map((child) => collectFromEntry(child)));
  return nested.flat();
}

/**
 * Returns whether any drag item is a directory entry (folder drop).
 */
export function dataTransferContainsDirectory(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer?.items) return false;
  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== "file") continue;
    const withEntry = item as DataTransferItemWithEntry;
    const entry = withEntry.webkitGetAsEntry?.() ?? null;
    if (entry?.isDirectory) return true;
  }
  return false;
}

/**
 * Collects all files from a drop, walking folders when the browser exposes directory entries.
 */
export async function collectFilesFromDataTransfer(
  dataTransfer: DataTransfer | null | undefined,
): Promise<File[]> {
  if (!dataTransfer) return [];

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    const entries: FileSystemEntryLike[] = [];
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      const withEntry = item as DataTransferItemWithEntry;
      const entry = withEntry.webkitGetAsEntry?.() ?? null;
      if (entry) {
        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      const nested = await Promise.all(entries.map((entry) => collectFromEntry(entry)));
      const files = nested.flat();
      if (files.length > 0) {
        return files;
      }
    }
  }

  return Array.from(dataTransfer.files ?? []);
}
