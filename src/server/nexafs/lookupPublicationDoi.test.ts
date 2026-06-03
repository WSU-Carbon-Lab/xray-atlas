import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  clearPublicationLookupCacheForTests,
  lookupPublicationDoi,
} from "./lookupPublicationDoi";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

describe("lookupPublicationDoi", () => {
  it("resolves a DOI via Crossref", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("api.crossref.org/works/10.1000%2Fexample")) {
        return new Response(
          JSON.stringify({
            message: {
              DOI: "10.1000/example",
              title: ["Example Paper"],
              author: [{ given: "Ada", family: "Lovelace" }],
              "container-title": ["Nature"],
              published: { "date-parts": [[2020]] },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    clearPublicationLookupCacheForTests();
    try {
      const result = await lookupPublicationDoi("10.1000/example");
      expect(result).toEqual({
        kind: "resolved",
        citation: {
          doi: "10.1000/example",
          title: "Example Paper",
          journal: "Nature",
          year: 2020,
          authors: ["Ada Lovelace"],
        },
      });
    } finally {
      globalThis.fetch = previousFetch;
      clearPublicationLookupCacheForTests();
    }
  });

  it("returns not_found for unknown DOI", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response("missing", { status: 404 })) as typeof fetch;

    clearPublicationLookupCacheForTests();
    try {
      const result = await lookupPublicationDoi("10.1000/missing-doi");
      expect(result.kind).toBe("not_found");
    } finally {
      globalThis.fetch = previousFetch;
      clearPublicationLookupCacheForTests();
    }
  });
});
