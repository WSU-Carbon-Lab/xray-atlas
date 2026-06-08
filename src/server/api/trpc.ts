import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  assertPasskeyEnrolledForContribute,
  SessionAalRequiredError,
  assertSessionAalForPrivilegedWrites,
} from "~/server/auth/mfa-access";
import { hasManageUsersCapability } from "~/server/auth/privileged-role";

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
    clientIp: opts.clientIp,
    userAgent: opts.userAgent,
    req: opts.req,
    db,
  };
};

export const createTRPCContext = async (
  opts: FetchCreateContextOptions = {},
) => {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const clientIp = getClientIpFromRequest(opts.req);
  const userAgent = opts.req?.headers.get("user-agent")?.trim() ?? null;

  return createInnerTRPCContext({
    userId,
    clientIp,
    userAgent,
    req: opts.req,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    const sessionAalAppCode =
      error.cause instanceof SessionAalRequiredError
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

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

const enforcePasskeyForContribute = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await assertPasskeyEnrolledForContribute(ctx.db, ctx.userId);
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

/** Mutations that create or modify contributed scientific records require passkey enrollment. */
export const contributeWriteProcedure =
  protectedProcedure.use(enforcePasskeyForContribute);

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

const enforcePrivilegedSessionAal = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  await assertSessionAalForPrivilegedWrites(ctx.db, ctx.userId, ctx.req);
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

/** Destructive or ownership-changing writes require passkey enrollment and session AAL. */
export const privilegedWriteProcedure =
  protectedProcedure.use(enforcePrivilegedSessionAal);

/**
 * Authenticated writes that require user-administration permission but not passkey session AAL.
 * Use for low-risk metadata edits; destructive admin actions should use {@link adminProcedure}.
 */
export const manageUsersProcedure = protectedProcedure.use(enforceManageUsers);

export const adminProcedure = protectedProcedure
  .use(enforceManageUsers)
  .use(enforcePrivilegedSessionAal);
