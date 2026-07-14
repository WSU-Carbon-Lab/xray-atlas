import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import { TRPCClientError } from "@trpc/client";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import type { AppRouter } from "~/server/api/root";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailableError,
  resolveDatabaseErrorMessage,
} from "./database-unavailable";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function trpcError(
  message: string,
  code: TRPC_ERROR_CODE_KEY,
  httpStatus = 500,
): TRPCClientError<AppRouter> {
  return new TRPCClientError<AppRouter>(message, {
    result: {
      error: {
        message,
        code: -32603,
        data: {
          code,
          httpStatus,
          appCode: undefined,
          zodError: null,
        },
      },
    },
  });
}

describe("isDatabaseUnavailableError", () => {
  it("detects Prisma reachability codes in INTERNAL_SERVER_ERROR", () => {
    expect(
      isDatabaseUnavailableError(
        trpcError(
          "Can't reach database server at `pooler.supabase.com:6543` (P1001)",
          "INTERNAL_SERVER_ERROR",
        ),
      ),
    ).toBe(true);
  });

  it("detects fetch transport failures", () => {
    expect(isDatabaseUnavailableError(new TypeError("Failed to fetch"))).toBe(
      true,
    );
  });

  it("detects JSON parse failures from non-tRPC HTML responses", () => {
    expect(
      isDatabaseUnavailableError(
        new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"),
      ),
    ).toBe(true);
  });

  it("detects gateway status codes on tRPC errors", () => {
    expect(
      isDatabaseUnavailableError(
        trpcError("Service Unavailable", "INTERNAL_SERVER_ERROR", 503),
      ),
    ).toBe(true);
  });

  it("detects Supabase pooler circuit breaker messages", () => {
    expect(
      isDatabaseUnavailableError(
        trpcError(
          "(ECIRCUITBREAKER) too many authentication failures, new connections are temporarily blocked",
          "INTERNAL_SERVER_ERROR",
        ),
      ),
    ).toBe(true);
  });

  it("does not classify NOT_FOUND as database unavailable", () => {
    expect(
      isDatabaseUnavailableError(
        trpcError("Experiment not found", "NOT_FOUND", 404),
      ),
    ).toBe(false);
  });

  it("does not classify UNAUTHORIZED as database unavailable", () => {
    expect(
      isDatabaseUnavailableError(
        trpcError("You must be signed in", "UNAUTHORIZED", 401),
      ),
    ).toBe(false);
  });
});

describe("resolveDatabaseErrorMessage", () => {
  it("returns catalog outage copy for database failures", () => {
    expect(
      resolveDatabaseErrorMessage(new TypeError("Failed to fetch")),
    ).toBe(databaseUnavailableMessage);
  });
});
