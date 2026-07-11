/**
 * Scrolls a NEXAFS experiment card into the vertical center of the window.
 *
 * Used after `/d/{id}` redirects to `/molecules/{slug}?nexafsExperiment=…`.
 * Retries until the card exists in the DOM and is roughly centered, because the
 * molecule page mounts the browse list after hydration and URL facet sync.
 */

export function nexafsExperimentCardDomId(experimentId: string): string {
  return `nexafs-experiment-${experimentId}`;
}

function cardMidpointInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight;
  if (vh <= 0) return false;
  const mid = rect.top + rect.height / 2;
  return mid >= vh * 0.2 && mid <= vh * 0.8;
}

function scrollElementToViewportCenter(el: Element): void {
  const rect = el.getBoundingClientRect();
  const absoluteTop = window.scrollY + rect.top;
  const target = absoluteTop + rect.height / 2 - window.innerHeight / 2;
  window.scrollTo({ top: Math.max(0, target), left: 0, behavior: "auto" });
}

export interface ScheduleScrollNexafsExperimentCardOptions {
  /** Invoked once the card midpoint is inside the central viewport band. */
  onSettled?: () => void;
}

/**
 * Schedules retries that scroll the experiment card into the viewport center.
 *
 * @param experimentId - Atlas experiment UUID matching `id="nexafs-experiment-…"`.
 * @param options - Optional settle callback.
 * @returns Cancel function for the retry loop (call from effect cleanup).
 */
export function scheduleScrollNexafsExperimentCardIntoView(
  experimentId: string,
  options?: ScheduleScrollNexafsExperimentCardOptions,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const id = experimentId.trim();
  if (!id) {
    return () => undefined;
  }

  let cancelled = false;
  let attempts = 0;
  let timeoutId = 0;
  const maxAttempts = 80;
  const onSettled = options?.onSettled;

  const finish = (): void => {
    if (cancelled) return;
    onSettled?.();
  };

  const tick = (): void => {
    if (cancelled) return;
    const el = document.getElementById(nexafsExperimentCardDomId(id));
    if (!el) {
      attempts += 1;
      if (attempts < maxAttempts) {
        timeoutId = window.setTimeout(tick, 50);
      } else {
        finish();
      }
      return;
    }

    scrollElementToViewportCenter(el);

    if (cardMidpointInViewport(el)) {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        scrollElementToViewportCenter(el);
        finish();
      }, 220);
      return;
    }

    attempts += 1;
    if (attempts < maxAttempts) {
      timeoutId = window.setTimeout(tick, 50);
    } else {
      finish();
    }
  };

  timeoutId = window.setTimeout(tick, 0);

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutId);
  };
}
