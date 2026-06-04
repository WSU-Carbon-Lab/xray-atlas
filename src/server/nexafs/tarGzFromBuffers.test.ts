import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { gunzipSync } from "node:zlib";
import { buffersToTarGz } from "./tarGzFromBuffers";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("buffersToTarGz", () => {
  it("produces a gzip tar containing the entry name", async () => {
    const archive = await buffersToTarGz([
      { path: "hello.txt", data: Buffer.from("hello", "utf-8") },
    ]);
    expect(archive.length).toBeGreaterThan(10);
    const decompressed = gunzipSync(archive);
    expect(decompressed.includes(Buffer.from("hello.txt"))).toBe(true);
    expect(decompressed.includes(Buffer.from("hello"))).toBe(true);
  });
});
