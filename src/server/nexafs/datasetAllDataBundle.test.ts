import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { gunzipSync } from "node:zlib";
import type { PrismaClient } from "~/prisma/client";
import { buildDatasetAllDataBundle } from "./datasetAllDataBundle";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toBeGreaterThan: (expected: number) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

const EXPERIMENT_ID = "30539a6a-e81d-4275-9f62-87acf19b6768";

function createBundleMockDb(config: {
  experimentAux?: boolean;
  sampleAux?: boolean;
}): PrismaClient {
  const sampleId = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
  return {
    experiments: {
      findUnique: async () => ({
        id: EXPERIMENT_ID,
        samples: {
          id: sampleId,
          molecules: { chemicalformula: "C72H14O2" },
        },
      }),
    },
    spectrumpoints: {
      findMany: async () => [
        {
          polarizationid: null,
          energyev: 280,
          rawabs: 0.11,
          od: 0.5,
          massabsorption: 0.12,
          beta: 0.02,
          delta: 0.001,
          i0: null,
          polarizations: { polardeg: 55, azimuthdeg: 0 },
        },
        {
          polarizationid: null,
          energyev: 285,
          rawabs: 0.17,
          od: 0.55,
          massabsorption: 0.18,
          beta: 0.03,
          delta: 0.002,
          i0: null,
          polarizations: { polardeg: 55, azimuthdeg: 0 },
        },
      ],
    },
    experimentfile: {
      findMany: async () =>
        config.experimentAux
          ? [
              {
                storagepath: "exp/aux1.bin",
                originalfilename: "raw_scan.bin",
              },
            ]
          : [],
    },
    samplefile: {
      findMany: async () =>
        config.sampleAux
          ? [
              {
                storagepath: "sample/aux1.csv",
                originalfilename: "prep_notes.csv",
              },
            ]
          : [],
    },
  } as unknown as PrismaClient;
}

describe("buildDatasetAllDataBundle", () => {
  it("builds tar.gz with spectrum CSV without Henke bare-atom columns", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.reject(new Error("Henke fetch blocked in test"))) as typeof fetch;

    try {
      const { buffer, downloadFilename } = await buildDatasetAllDataBundle(
        createBundleMockDb({}),
        EXPERIMENT_ID,
      );

      expect(downloadFilename).toBe(
        "nexafs-experiment-30539a6a-all-data.tar.gz",
      );
      expect(buffer.length).toBeGreaterThan(10);

      const decompressed = gunzipSync(buffer);
      expect(decompressed.includes(Buffer.from("spectrum-all-polarizations.csv"))).toBe(
        true,
      );
      expect(decompressed.includes(Buffer.from("bare_atom_mu"))).toBe(false);
      expect(decompressed.includes(Buffer.from("280.000000"))).toBe(true);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });
});
