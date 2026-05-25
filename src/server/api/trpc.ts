import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
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
}

interface FetchCreateContextOptions {
  req?: Request;
  resHeaders?: Headers;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    clientIp: opts.clientIp,
    db,
  };
};

export const createTRPCContext = async (
  opts: FetchCreateContextOptions = {},
) => {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const clientIp = getClientIpFromRequest(opts.req);

  return createInnerTRPCContext({
    userId,
    clientIp,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
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

export const adminProcedure = protectedProcedure.use(enforceManageUsers);
