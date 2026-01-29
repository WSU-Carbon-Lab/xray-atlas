import { initTRPC, TRPCError } from "@trpc/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { cookies } from "next/headers";
import { isDevMockUser, DEV_MOCK_USER_ID } from "~/lib/dev-mock-data";

interface CreateContextOptions {
  userId: string | null;
  isDevMock: boolean;
}

interface FetchCreateContextOptions {
  req?: Request;
  resHeaders?: Headers;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    isDevMock: opts.isDevMock,
    db,
  };
};

export const createTRPCContext = async (
  _opts: FetchCreateContextOptions = {},
) => {
  const session = await auth();
  let userId = session?.user?.id ?? null;
  let isDevMock = false;

  if (process.env.NODE_ENV === "development") {
    const cookieStore = await cookies();
    const devSession = cookieStore.get("dev-auth-session");
    if (devSession?.value === DEV_MOCK_USER_ID) {
      userId = DEV_MOCK_USER_ID;
      isDevMock = true;
    }
  }

  return createInnerTRPCContext({
    userId,
    isDevMock,
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
      isDevMock: ctx.isDevMock,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
