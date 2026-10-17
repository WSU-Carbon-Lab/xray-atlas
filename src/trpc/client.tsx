"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { DatabaseUnavailableProvider } from "~/hooks/use-database-unavailable";
import type { AppRouter } from "~/server/api/root";
import { getBaseUrl } from "~/utils/getBaseUrl";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Provides the tRPC and React Query clients. Queries stay fresh for 30 seconds
 * unless a call site sets its own `staleTime`.
 */
export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );

  const { Provider: TRPCProvider } = trpc;

  return (
    <TRPCProvider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <DatabaseUnavailableProvider queryClient={queryClient}>
          {props.children}
        </DatabaseUnavailableProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
}
