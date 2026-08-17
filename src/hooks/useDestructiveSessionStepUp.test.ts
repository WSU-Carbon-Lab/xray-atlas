import { describe as bunDescribe, expect as bunExpect, it as bunIt } from "bun:test";
import { TRPCClientError } from "@trpc/client";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import type { AppRouter } from "~/server/api/root";
import { isSessionAalRequiredError } from "~/lib/passkey-client-auth";

type ExpectAssertions = { toBe: (expected: unknown) => void };
const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void) => void;
const expect = bunExpect as (actual: unknown) => ExpectAssertions;

/**
 * Builds a TRPCClientError shaped like the repo's real errorFormatter output
 * (see `src/server/api/trpc.ts`), which nests `appCode` inside `data` rather
 * than at the top level of `error`.
 */
function trpcError(
  appCode: "SESSION_AAL_REQUIRED" | "SESSION_AAL3_REQUIRED" | undefined,
  code: TRPC_ERROR_CODE_KEY = "FORBIDDEN",
): TRPCClientError<AppRouter> {
  return new TRPCClientError<AppRouter>("nope", {
    result: {
      error: {
        message: "nope",
        code: -32603,
        data: {
          code,
          httpStatus: 403,
          appCode,
          zodError: null,
        },
      },
    },
  });
}

describe("isSessionAalRequiredError", () => {
  it("recognizes a FORBIDDEN TRPCClientError carrying a SESSION_AAL_REQUIRED appCode", () => {
    expect(isSessionAalRequiredError(trpcError("SESSION_AAL_REQUIRED"))).toBe(
      true,
    );
  });

  it("recognizes a FORBIDDEN TRPCClientError carrying a SESSION_AAL3_REQUIRED appCode", () => {
    expect(isSessionAalRequiredError(trpcError("SESSION_AAL3_REQUIRED"))).toBe(
      true,
    );
  });

  it("rejects a FORBIDDEN TRPCClientError with no appCode", () => {
    expect(isSessionAalRequiredError(trpcError(undefined))).toBe(false);
  });

  it("rejects a non-FORBIDDEN TRPCClientError with a SESSION_AAL_REQUIRED appCode", () => {
    expect(
      isSessionAalRequiredError(
        trpcError("SESSION_AAL_REQUIRED", "UNAUTHORIZED"),
      ),
    ).toBe(false);
  });

  it("rejects an unrelated error", () => {
    expect(isSessionAalRequiredError(new Error("boom"))).toBe(false);
  });
});
