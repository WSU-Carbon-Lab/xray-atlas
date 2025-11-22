import { initTRPC, TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "~/server/db";

interface CreateContextOptions {
  userId: string | null;
}

interface FetchCreateContextOptions {
  req?: Request;
  resHeaders?: Headers;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    db,
  };
};

export const createTRPCContext = async (
  _opts: FetchCreateContextOptions = {}, // Parameter kept for API consistency but not used
) => {
  const authResult = await auth();
  const user = await currentUser();
  const userId = user?.id ?? authResult?.userId ?? null;

  return createInnerTRPCContext({
    userId,
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
