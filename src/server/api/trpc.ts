import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { getSessionUserIdFromCookies } from "~/server/auth/session-token";
import {
  assertPasskeyEnrolledForContribute,
  SessionAalRequiredError,
  assertSessionAalForAdminWrites,
  assertSessionAalForDestructiveWrites,
} from "~/server/auth/mfa-access";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";
import {
  assertContributionAgreement,
  ContributionAgreementRequiredError,
} from "~/server/auth/contribution-agreement-gate";
import { resolveBearerContext, type CliScope } from "~/server/cli/cli-scopes";

function getClientIpFromRequest(req: Request | undefined): string | null {
  if (!req) return null;
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

interface CreateContextOptions {
  userId: string | null;
  tokenScopes: readonly CliScope[] | null;
  clientIp: string | null;
  userAgent: string | null;
  req?: Request;
}

interface FetchCreateContextOptions {
  req?: Request;
  resHeaders?: Headers;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    tokenScopes: opts.tokenScopes,
    clientIp: opts.clientIp,
    userAgent: opts.userAgent,
    req: opts.req,
    db,
  };
};

export const createTRPCContext = async (
  opts: FetchCreateContextOptions = {},
) => {
  const sessionUserId = await getSessionUserIdFromCookies(db);
  // A cookie session wins; a bearer is consulted only without one.
  const bearer =
    sessionUserId === null && opts.req
      ? await resolveBearerContext(opts.req.headers.get("authorization"))
      : null;
  const userId = sessionUserId ?? bearer?.userId ?? null;
  const clientIp = getClientIpFromRequest(opts.req);
  const userAgent = opts.req?.headers.get("user-agent")?.trim() ?? null;

  return createInnerTRPCContext({
    userId,
    tokenScopes: bearer?.scopes ?? null,
    clientIp,
    userAgent,
    req: opts.req,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    const sessionAalAppCode =
      error.cause instanceof SessionAalRequiredError ||
      error.cause instanceof ContributionAgreementRequiredError
        ? error.cause.appCode
        : undefined;
    return {
      ...shape,
      data: {
        ...shape.data,
        appCode: sessionAalAppCode,
        zodError:
          error.cause instanceof Error &&
          "name" in error.cause &&
          error.cause.name === "ZodError" &&
          "flatten" in error.cause &&
          typeof error.cause.flatten === "function"
            ? (error.cause as { flatten: () => unknown }).flatten()
            : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const TOKEN_SCOPE_FORBIDDEN = "CLI_TOKEN_SCOPE_FORBIDDEN";

/**
 * Procedure paths (`router.procedure`) of `protectedProcedure` queries that a bearer token
 * holding `read` may call.
 *
 * Every `protectedProcedure` query not listed here is FORBIDDEN for token contexts, because
 * those queries return account-private data (profile row, passkeys, pending attributions,
 * dashboard state). Adding a name widens what a leaked read-only token can see: add only
 * procedures whose output is already safe to hand to the token holder. `publicProcedure`
 * queries are not gated by this list, and `contributeWriteProcedure` has its own scope rule.
 */
export const TOKEN_READABLE_PROTECTED_QUERIES: readonly string[] = [
  // Own token list for `xatlas auth tokens`: names, prefixes, scopes, dates; never hashes.
  "users.listCliTokens",
];

/**
 * Bearer-token contexts (`tokenScopes` non-null) may call a `protectedProcedure` query only
 * when its path is in {@link TOKEN_READABLE_PROTECTED_QUERIES} and the token holds `read`.
 * Cookie sessions pass through.
 */
const enforceTokenReadScope = t.middleware(({ ctx, type, path, next }) => {
  if (ctx.tokenScopes !== null && type === "query") {
    if (
      !TOKEN_READABLE_PROTECTED_QUERIES.includes(path) ||
      !ctx.tokenScopes.includes("read")
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${TOKEN_SCOPE_FORBIDDEN}: this query is only available in the browser.`,
      });
    }
  }
  return next();
});

/**
 * Bearer-token contexts need `write` for contribution mutations and `read`
 * for queries. Cookie sessions pass through.
 */
const enforceTokenWriteScope = t.middleware(({ ctx, type, next }) => {
  if (ctx.tokenScopes !== null) {
    const needed: CliScope = type === "mutation" ? "write" : "read";
    if (!ctx.tokenScopes.includes(needed)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `${TOKEN_SCOPE_FORBIDDEN}: this token lacks the ${needed} scope.`,
      });
    }
  }
  return next();
});

/**
 * Bearer tokens may only run mutations through {@link contributeWriteProcedure}.
 * Account, passkey, and attribution-preference mutations stay browser-only.
 */
const refuseTokenMutations = t.middleware(({ ctx, type, next }) => {
  if (ctx.tokenScopes !== null && type === "mutation") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${TOKEN_SCOPE_FORBIDDEN}: this action is only available in the browser.`,
    });
  }
  return next();
});

/** Refuses every bearer-token context; step-up and administration are browser-only. */
const refuseTokenContext = t.middleware(({ ctx, next }) => {
  if (ctx.tokenScopes !== null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${TOKEN_SCOPE_FORBIDDEN}: passkey step-up is only available in the browser.`,
    });
  }
  return next();
});

const authenticatedProcedure = t.procedure.use(enforceUserIsAuthed);

/**
 * Authenticated procedures. Cookie sessions are unrestricted. Bearer tokens may
 * call only the queries in {@link TOKEN_READABLE_PROTECTED_QUERIES} and no mutations.
 */
export const protectedProcedure = authenticatedProcedure
  .use(enforceTokenReadScope)
  .use(refuseTokenMutations);

const enforcePasskeyForContribute = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await assertPasskeyEnrolledForContribute(ctx.db, ctx.userId);
  await assertContributionAgreement(ctx.db, ctx.userId);
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

/**
 * Browser contribution writes that are outside the CLI write surface.
 *
 * Requires passkey enrollment and the current contribution agreement, the same
 * checks as {@link contributeWriteProcedure}. Bearer tokens are refused, the
 * same as {@link protectedProcedure}.
 */
export const contributeSessionProcedure = protectedProcedure.use(
  enforcePasskeyForContribute,
);

/**
 * Mutations that create or modify contributed scientific records require passkey
 * enrollment and the current contribution agreement (FORBIDDEN with message
 * `CONTRIBUTION_AGREEMENT_REQUIRED` otherwise). Bearer tokens need the `write`
 * scope for mutations and `read` for queries.
 */
export const contributeWriteProcedure = authenticatedProcedure
  .use(enforceTokenWriteScope)
  .use(enforcePasskeyForContribute);

const enforceManageUsers = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const allowed = await hasManageUsersCapability(ctx.db, ctx.userId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrator access is required for this action.",
    });
  }
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const enforceDestructiveSessionAal = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await assertSessionAalForDestructiveWrites(ctx.db, ctx.userId, ctx.req);
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

const enforceAdminSessionAal = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await assertSessionAalForAdminWrites(ctx.db, ctx.userId, ctx.req);
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

/**
 * Destructive or ownership-changing self-service writes require passkey enrollment and AAL2
 * (passkey-established session) established within the step-up window. Role-based AAL3 is not
 * applied here; use {@link adminProcedure} for administrator console mutations.
 */
export const destructiveWriteProcedure = authenticatedProcedure
  .use(refuseTokenContext)
  .use(enforceDestructiveSessionAal);

/**
 * Authenticated writes that require user-administration permission but not passkey session AAL.
 * Use for low-risk metadata edits; destructive admin actions should use {@link adminProcedure}.
 */
export const manageUsersProcedure = authenticatedProcedure
  .use(refuseTokenContext)
  .use(enforceManageUsers);

/**
 * Administrator console mutations require user-administration permission and a
 * passkey-established AAL2 session. Hardware-key AAL3 is not required.
 */
export const adminProcedure = authenticatedProcedure
  .use(refuseTokenContext)
  .use(enforceManageUsers)
  .use(enforceAdminSessionAal);
