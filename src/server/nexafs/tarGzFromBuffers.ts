import { createGzip } from "node:zlib";
import { pack as createTarPack } from "tar-stream";

export type TarGzEntry = {
  readonly path: string;
  readonly data: Buffer;
};

/**
 * Packs in-memory files into a single gzip-compressed tar archive suitable for HTTP download.
 */
export function buffersToTarGz(entries: readonly TarGzEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tarball = createTarPack();
    const gzip = createGzip();
    const chunks: Buffer[] = [];

    tarball.on("error", reject);
    gzip.on("error", reject);
    gzip.on("data", (chunk: Buffer) => chunks.push(chunk));
    gzip.on("end", () => resolve(Buffer.concat(chunks)));

    tarball.pipe(gzip);

    if (entries.length === 0) {
      tarball.finalize();
      return;
    }

    let pending = entries.length;
    for (const entry of entries) {
      tarball.entry(
        { name: entry.path, size: entry.data.length },
        entry.data,
        (err: Error | null | undefined) => {
          if (err) {
            reject(err);
            return;
          }
          pending -= 1;
          if (pending === 0) {
            tarball.finalize();
          }
        },
      );
    }
  });
}
