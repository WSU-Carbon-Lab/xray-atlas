export type LookupRequestGeneration = {
  next: () => number;
  isCurrent: (generation: number) => boolean;
};

/**
 * Monotonic lookup generation guard: only the latest async lookup may commit results.
 */
export function createLookupRequestGeneration(): LookupRequestGeneration {
  let generation = 0;
  return {
    next: () => {
      generation += 1;
      return generation;
    },
    isCurrent: (value: number) => value === generation,
  };
}

/**
 * Reuses an in-flight lookup generation when nested calls share one user action.
 */
export function resolveLookupGeneration(
  guard: LookupRequestGeneration,
  reuseGeneration?: number,
): number {
  return reuseGeneration ?? guard.next();
}
