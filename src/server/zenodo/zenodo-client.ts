/**
 * Thin HTTPS client for the Zenodo Deposit REST API used by Atlas repository depositor minting.
 *
 * Requires a personal access token with `deposit:write` and `deposit:actions`. Maps HTTP failures
 * to {@link ZenodoApiError} with stable status codes for retry and logging.
 */

import {
  zenodoAccessToken,
  zenodoBaseUrl,
} from "~/server/zenodo/zenodo-config";

export interface ZenodoCreator {
  name: string;
  orcid?: string;
  affiliation?: string;
}

export interface ZenodoRelatedIdentifier {
  identifier: string;
  relation: string;
  scheme?: string;
  resource_type?: string;
}

export interface ZenodoDepositMetadata {
  title: string;
  description: string;
  upload_type: "dataset";
  access_right: "open";
  license: string;
  creators: ZenodoCreator[];
  communities?: ReadonlyArray<{ identifier: string }>;
  related_identifiers?: ZenodoRelatedIdentifier[];
  keywords?: string[];
  notes?: string;
}

export interface ZenodoDepositionLinks {
  self: string;
  html?: string;
  bucket?: string;
  publish?: string;
  discard?: string;
  edit?: string;
  files?: string;
  newversion?: string;
  latest_draft?: string;
}

export interface ZenodoDepositionFile {
  id: string;
  filename: string;
  filesize?: number;
  checksum?: string;
  links?: { download?: string; self?: string };
}

export interface ZenodoDeposition {
  id: number;
  conceptrecid?: string | number;
  doi?: string | null;
  doi_url?: string | null;
  record_id?: number | null;
  state?: string | null;
  submitted?: boolean;
  links: ZenodoDepositionLinks;
  metadata?: Partial<ZenodoDepositMetadata> & Record<string, unknown>;
}

export class ZenodoApiError extends Error {
  readonly status: number;
  readonly bodyText: string;

  constructor(status: number, message: string, bodyText: string) {
    super(message);
    this.name = "ZenodoApiError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export interface ZenodoClientOptions {
  accessToken?: string | null;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  /**
   * Per-request abort timeout in milliseconds. Defaults to 120_000.
   * Prevents indefinite hangs on stalled Zenodo uploads or API calls.
   */
  requestTimeoutMs?: number;
}

/** Zenodo bucket uploads require this Content-Type (gzip is rejected with HTTP 415). */
export const ZENODO_BUCKET_UPLOAD_CONTENT_TYPE = "application/octet-stream";

const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function truncateBody(text: string, maxLen = 500): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}

/**
 * Creates a Zenodo Deposit API client bound to the Atlas depositor token and API base URL.
 *
 * @param options - Optional token, base URL, fetch implementation, and retry budget overrides.
 * @returns Client with create/update/upload/publish/get helpers.
 * @throws {Error} When no access token is available (minting disabled).
 */
export function createZenodoClient(options: ZenodoClientOptions = {}) {
  const accessToken = options.accessToken ?? zenodoAccessToken();
  if (!accessToken) {
    throw new Error(
      "Zenodo minting is disabled: ZENODO_ACCESS_TOKEN is not configured.",
    );
  }
  const baseUrl = (options.baseUrl ?? zenodoBaseUrl()).replace(/\/$/, "");
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxRetries = options.maxRetries ?? 4;
  const requestTimeoutMs =
    options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  async function requestJson<T>(
    method: string,
    pathOrUrl: string,
    init?: {
      body?: BodyInit | null;
      headers?: Record<string, string>;
      expectEmpty?: boolean;
      timeoutMs?: number;
    },
  ): Promise<T> {
    const url = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
    const timeoutMs = init?.timeoutMs ?? requestTimeoutMs;

    let attempt = 0;
    for (;;) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            ...(init?.headers ?? {}),
          },
          body: init?.body ?? null,
          signal: controller.signal,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (
          error instanceof Error &&
          (error.name === "AbortError" || error.message.includes("aborted"))
        ) {
          throw new ZenodoApiError(
            408,
            `Zenodo ${method} ${url} timed out after ${timeoutMs}ms`,
            "",
          );
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      if (
        (response.status === 429 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxRetries
      ) {
        const retryAfterRaw = response.headers.get("retry-after");
        const retryAfterSec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
        const delayMs = Number.isFinite(retryAfterSec)
          ? Math.max(250, retryAfterSec * 1000)
          : Math.min(16_000, 750 * 2 ** attempt);
        attempt += 1;
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        const bodyText = truncateBody(await response.text());
        throw new ZenodoApiError(
          response.status,
          `Zenodo ${method} ${url} failed with ${response.status}`,
          bodyText,
        );
      }

      if (init?.expectEmpty || response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      if (!text.trim()) {
        return undefined as T;
      }
      return JSON.parse(text) as T;
    }
  }

  /**
   * Creates an empty deposition draft and returns Zenodo ids plus bucket upload links.
   */
  async function createDeposition(): Promise<ZenodoDeposition> {
    return requestJson<ZenodoDeposition>("POST", "/deposit/depositions", {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  /**
   * Replaces deposition metadata for an existing draft.
   *
   * @param depositionId - Zenodo deposition id.
   * @param metadata - Zenodo metadata payload (`upload_type: dataset`, creators, community, …).
   */
  async function updateDepositionMetadata(
    depositionId: number,
    metadata: ZenodoDepositMetadata,
  ): Promise<ZenodoDeposition> {
    return requestJson<ZenodoDeposition>(
      "PUT",
      `/deposit/depositions/${depositionId}`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      },
    );
  }

  /**
   * Uploads a file into the deposition bucket via the new files API.
   *
   * Zenodo requires `Content-Type: application/octet-stream` for bucket PUTs;
   * other types (including `application/gzip`) return HTTP 415.
   *
   * @param bucketUrl - Absolute `links.bucket` URL from the deposition response.
   * @param filename - Object name inside the bucket (for example `nexafs-….tar.gz`).
   * @param bytes - File contents.
   * @param contentType - Optional Content-Type header (defaults to octet-stream).
   * @param timeoutMs - Optional per-upload timeout override (large archives).
   */
  async function uploadBucketFile(
    bucketUrl: string,
    filename: string,
    bytes: Buffer | Uint8Array,
    contentType: string = ZENODO_BUCKET_UPLOAD_CONTENT_TYPE,
    timeoutMs?: number,
  ): Promise<void> {
    const encodedName = encodeURIComponent(filename);
    const url = `${bucketUrl.replace(/\/$/, "")}/${encodedName}`;
    const body = bytes instanceof Buffer ? bytes : Buffer.from(bytes);
    await requestJson<unknown>("PUT", url, {
      headers: { "Content-Type": contentType },
      body,
      expectEmpty: false,
      timeoutMs: timeoutMs ?? Math.max(requestTimeoutMs, 300_000),
    });
  }

  /**
   * Publishes a deposition. Zenodo may respond with 202; callers should poll {@link getDeposition}.
   *
   * @param depositionId - Zenodo deposition id.
   */
  async function publishDeposition(
    depositionId: number,
  ): Promise<ZenodoDeposition> {
    return requestJson<ZenodoDeposition>(
      "POST",
      `/deposit/depositions/${depositionId}/actions/publish`,
    );
  }

  /**
   * Unlocks a published deposition for metadata edits (`actions/edit`).
   *
   * Zenodo only accepts {@link updateDepositionMetadata} on unpublished drafts.
   * After editing, callers must {@link publishDeposition} again to re-register
   * DataCite metadata (DOI string stays the same).
   *
   * @param depositionId - Zenodo deposition id.
   */
  async function editDeposition(
    depositionId: number,
  ): Promise<ZenodoDeposition> {
    return requestJson<ZenodoDeposition>(
      "POST",
      `/deposit/depositions/${depositionId}/actions/edit`,
    );
  }

  /**
   * Loads the current deposition document (state, DOI, record links).
   *
   * @param depositionId - Zenodo deposition id.
   */
  async function getDeposition(depositionId: number): Promise<ZenodoDeposition> {
    return requestJson<ZenodoDeposition>(
      "GET",
      `/deposit/depositions/${depositionId}`,
    );
  }

  /**
   * Creates a new unpublished version of a published deposition.
   *
   * Zenodo returns the *original* resource; the new draft is at
   * `links.latest_draft`. This helper follows that link and returns the draft.
   *
   * @param depositionId - Id of the latest published version in the concept.
   * @returns The new unpublished draft deposition (new id, empty of edits yet).
   */
  async function newVersionDeposition(
    depositionId: number,
  ): Promise<ZenodoDeposition> {
    const original = await requestJson<ZenodoDeposition>(
      "POST",
      `/deposit/depositions/${depositionId}/actions/newversion`,
    );
    const latestDraft = original.links.latest_draft?.trim();
    if (!latestDraft) {
      throw new ZenodoApiError(
        500,
        `Zenodo newversion for deposition ${depositionId} missing links.latest_draft`,
        JSON.stringify(original.links),
      );
    }
    return requestJson<ZenodoDeposition>("GET", latestDraft);
  }

  /**
   * Lists files attached to a deposition (draft or published).
   *
   * @param depositionId - Zenodo deposition id.
   */
  async function listDepositionFiles(
    depositionId: number,
  ): Promise<ZenodoDepositionFile[]> {
    return requestJson<ZenodoDepositionFile[]>(
      "GET",
      `/deposit/depositions/${depositionId}/files`,
    );
  }

  /**
   * Deletes a file from an unpublished deposition draft.
   *
   * @param depositionId - Zenodo deposition id (must be unpublished).
   * @param fileId - Zenodo file resource id from {@link listDepositionFiles}.
   */
  async function deleteDepositionFile(
    depositionId: number,
    fileId: string,
  ): Promise<void> {
    await requestJson<undefined>(
      "DELETE",
      `/deposit/depositions/${depositionId}/files/${fileId}`,
      { expectEmpty: true },
    );
  }

  return {
    createDeposition,
    updateDepositionMetadata,
    uploadBucketFile,
    publishDeposition,
    editDeposition,
    getDeposition,
    newVersionDeposition,
    listDepositionFiles,
    deleteDepositionFile,
  };
}

export type ZenodoClient = ReturnType<typeof createZenodoClient>;
