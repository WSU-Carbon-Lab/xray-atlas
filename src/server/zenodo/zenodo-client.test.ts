import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import {
  createZenodoClient,
  ZenodoApiError,
  ZENODO_BUCKET_UPLOAD_CONTENT_TYPE,
} from "~/server/zenodo/zenodo-client";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toContain: (expected: string) => void;
  toBeInstanceOf: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (
  name: string,
  fn: () => void | Promise<void>,
) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createZenodoClient", () => {
  it("creates a deposition, updates metadata, uploads, publishes, and gets", async () => {
    const calls: Array<{
      method: string;
      url: string;
      contentType: string | null;
    }> = [];
    const fetchImpl = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      const headers = new Headers(init?.headers);
      calls.push({
        method,
        url,
        contentType: headers.get("Content-Type"),
      });

      if (method === "POST" && url.endsWith("/deposit/depositions")) {
        return jsonResponse({
          id: 42,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/42",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-1",
            html: "https://sandbox.zenodo.org/deposit/42",
          },
        });
      }
      if (method === "PUT" && url.includes("/deposit/depositions/42")) {
        return jsonResponse({
          id: 42,
          links: {
            self: url,
            bucket: "https://sandbox.zenodo.org/api/files/bucket-1",
          },
          metadata: { title: "t" },
        });
      }
      if (method === "PUT" && url.includes("/api/files/bucket-1/")) {
        return jsonResponse({ key: "file.tar.gz", size: 3 });
      }
      if (
        method === "POST" &&
        url.endsWith("/deposit/depositions/42/actions/publish")
      ) {
        return jsonResponse({
          id: 42,
          doi: "10.5072/zenodo.99",
          state: "done",
          submitted: true,
          record_id: 99,
          links: {
            self: url,
            html: "https://sandbox.zenodo.org/records/99",
            bucket: "https://sandbox.zenodo.org/api/files/bucket-1",
          },
        });
      }
      if (method === "GET" && url.endsWith("/deposit/depositions/42")) {
        return jsonResponse({
          id: 42,
          doi: "10.5072/zenodo.99",
          state: "done",
          links: {
            self: url,
            html: "https://sandbox.zenodo.org/records/99",
          },
        });
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
    });

    const created = await client.createDeposition();
    expect(created.id).toBe(42);

    await client.updateDepositionMetadata(42, {
      title: "NEXAFS dataset",
      description: "desc",
      upload_type: "dataset",
      access_right: "open",
      license: "cc-by-4.0",
      creators: [{ name: "Doe, Jane" }],
      communities: [{ identifier: "xrayatlas" }],
    });

    await client.uploadBucketFile(
      "https://sandbox.zenodo.org/api/files/bucket-1",
      "nexafs-test.tar.gz",
      Buffer.from("abc"),
    );

    const published = await client.publishDeposition(42);
    expect(published.doi).toBe("10.5072/zenodo.99");

    const got = await client.getDeposition(42);
    expect(got.state).toBe("done");

    expect(calls.length).toBe(5);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[3]!.url).toContain("/actions/publish");
    const uploadCall = calls.find(
      (call) => call.method === "PUT" && call.url.includes("/api/files/"),
    );
    expect(uploadCall?.contentType).toBe(ZENODO_BUCKET_UPLOAD_CONTENT_TYPE);
  });

  it("maps request abort to ZenodoApiError 408", async () => {
    const fetchImpl = (async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      return await new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error("missing signal"));
          return;
        }
        signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted.");
          err.name = "AbortError";
          reject(err);
        });
      });
    }) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
      requestTimeoutMs: 20,
    });

    let caught: unknown;
    try {
      await client.createDeposition();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZenodoApiError);
    expect((caught as ZenodoApiError).status).toBe(408);
  });

  it("maps non-OK responses to ZenodoApiError", async () => {
    const fetchImpl = (async () =>
      new Response("nope", { status: 403 })) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
    });

    let caught: unknown;
    try {
      await client.createDeposition();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ZenodoApiError);
    expect((caught as ZenodoApiError).status).toBe(403);
  });

  it("retries on HTTP 429 then succeeds", async () => {
    let hits = 0;
    const fetchImpl = (async () => {
      hits += 1;
      if (hits === 1) {
        return new Response("slow down", {
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return jsonResponse({
        id: 7,
        links: { self: "https://sandbox.zenodo.org/api/deposit/depositions/7" },
      });
    }) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
      maxRetries: 2,
    });

    const created = await client.createDeposition();
    expect(created.id).toBe(7);
    expect(hits).toBe(2);
  });

  it("unlocks a published deposition via actions/edit", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      calls.push(`${init?.method ?? "GET"} ${url}`);
      return jsonResponse({
        id: 42,
        submitted: false,
        state: "inprogress",
        links: {
          self: "https://sandbox.zenodo.org/api/deposit/depositions/42",
        },
      });
    }) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
    });

    const edited = await client.editDeposition(42);
    expect(edited.id).toBe(42);
    expect(calls[0]).toContain("/actions/edit");
  });

  it("follows latest_draft after actions/newversion", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      calls.push(`${method} ${url}`);
      if (method === "POST" && url.includes("/actions/newversion")) {
        return jsonResponse({
          id: 42,
          links: {
            self: "https://sandbox.zenodo.org/api/deposit/depositions/42",
            latest_draft:
              "https://sandbox.zenodo.org/api/deposit/depositions/99",
          },
        });
      }
      if (method === "GET" && url.endsWith("/deposit/depositions/99")) {
        return jsonResponse({
          id: 99,
          links: {
            self: url,
            bucket: "https://sandbox.zenodo.org/api/files/bucket-99",
          },
        });
      }
      return new Response("unexpected", { status: 500 });
    }) as typeof fetch;

    const client = createZenodoClient({
      accessToken: "test-token",
      baseUrl: "https://sandbox.zenodo.org/api",
      fetchImpl,
    });

    const draft = await client.newVersionDeposition(42);
    expect(draft.id).toBe(99);
    expect(calls[0]).toContain("/actions/newversion");
    expect(calls[1]).toContain("/deposit/depositions/99");
  });
});
