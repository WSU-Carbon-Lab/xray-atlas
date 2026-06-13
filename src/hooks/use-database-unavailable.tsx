"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailableError,
} from "~/lib/database-unavailable";

type DatabaseUnavailableContextValue = {
  isDatabaseUnavailable: boolean;
  message: string;
  clearDatabaseUnavailable: () => void;
};

const DatabaseUnavailableContext =
  createContext<DatabaseUnavailableContextValue | null>(null);

export type DatabaseUnavailableProviderProps = {
  queryClient: QueryClient;
  children: React.ReactNode;
};

/**
 * Tracks recent React Query failures that match database-unavailable signatures so
 * surfaces can show a shared degraded state without polling a health endpoint.
 */
export function DatabaseUnavailableProvider({
  queryClient,
  children,
}: DatabaseUnavailableProviderProps) {
  const [isDatabaseUnavailable, setIsDatabaseUnavailable] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    const unsubscribe = cache.subscribe((event) => {
      if (event?.type !== "updated") {
        return;
      }
      const { query } = event;
      if (
        query.state.status === "error" &&
        isDatabaseUnavailableError(query.state.error)
      ) {
        setIsDatabaseUnavailable(true);
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const clearDatabaseUnavailable = useCallback(() => {
    setIsDatabaseUnavailable(false);
  }, []);

  const value = useMemo(
    (): DatabaseUnavailableContextValue => ({
      isDatabaseUnavailable,
      message: databaseUnavailableMessage,
      clearDatabaseUnavailable,
    }),
    [clearDatabaseUnavailable, isDatabaseUnavailable],
  );

  return (
    <DatabaseUnavailableContext.Provider value={value}>
      {children}
    </DatabaseUnavailableContext.Provider>
  );
}

/**
 * When `error` is provided, classifies that failure. Otherwise exposes whether any
 * recent catalog query in the shared React Query cache failed with a database outage signature.
 */
export function useDatabaseUnavailable(error?: unknown): {
  isDatabaseUnavailable: boolean;
  message: string;
} {
  const context = useContext(DatabaseUnavailableContext);

  if (error !== undefined) {
    const unavailable = isDatabaseUnavailableError(error);
    return {
      isDatabaseUnavailable: unavailable,
      message: unavailable
        ? databaseUnavailableMessage
        : "We could not load this data. Please try again in a moment.",
    };
  }

  return {
    isDatabaseUnavailable: context?.isDatabaseUnavailable ?? false,
    message: context?.message ?? databaseUnavailableMessage,
  };
}
