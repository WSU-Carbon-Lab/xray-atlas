/**
 * Runs async tasks with a bounded concurrency pool; preserves result order matching `items`.
 *
 * @param items Work items passed to `worker` in order.
 * @param concurrency Maximum simultaneous in-flight tasks (at least 1).
 * @param worker Async mapper invoked once per item.
 * @returns Results in the same order as `items`.
 */
export async function fetchWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) {
    return [];
  }
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Map<number, TResult>();
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results.set(index, await worker(items[index]!, index));
    }
  }

  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    () => runWorker(),
  );
  await Promise.all(runners);
  return items.map((_, index) => results.get(index)!);
}
