import { createCallerFactory } from "~/server/api/trpc";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { headers } from "next/headers";

const createCaller = createCallerFactory(appRouter);

export const api = createCaller(async () => {
  const heads = new Headers(await headers());
  return createTRPCContext({
    req: new Request("http://localhost:3000", {
      headers: heads,
    }),
    resHeaders: new Headers(),
  });
});
