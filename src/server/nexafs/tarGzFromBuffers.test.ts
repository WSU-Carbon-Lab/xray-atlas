import { describe, expect, test } from "bun:test";
import { gunzipSync } from "node:zlib";
import { buffersToTarGz } from "./tarGzFromBuffers";

describe("buffersToTarGz", () => {
  test("produces a gzip tar containing the entry name", async () => {
    const archive = await buffersToTarGz([
      { path: "hello.txt", data: Buffer.from("hello", "utf-8") },
    ]);
    expect(archive.length).toBeGreaterThan(10);
    const decompressed = gunzipSync(archive);
    expect(decompressed.includes(Buffer.from("hello.txt"))).toBe(true);
    expect(decompressed.includes(Buffer.from("hello"))).toBe(true);
  });
});
