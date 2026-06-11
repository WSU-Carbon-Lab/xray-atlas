/**
 * Monotonic lookup generation guard: only the latest async lookup may commit results.
 */
export function createLookupRequestGeneration(): {
  next: () => number;
  isCurrent: (generation: number) => boolean;
} {
  let generation = 0;
  return {
    next: () => {
      generation += 1;
      return generation;
    },
    isCurrent: (value: number) => value === generation,
  };
}
