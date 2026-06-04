const compactOverflowCountChipBaseClassName =
  "inline-flex h-4.5 shrink-0 items-center rounded-full border px-1.5 text-[9px] font-semibold uppercase leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 sm:text-[10px]";

function joinChipClasses(...parts: Array<string | undefined>): string {
  return parts
    .filter((part) => part !== undefined && part.length > 0)
    .join(" ");
}

/**
 * Tailwind classes for compact card category-tag "+N" overflow triggers.
 * Pair with `inline-flex shrink-0 items-center` on the trigger element's layout wrapper when needed.
 */
export function compactOverflowCountChipClassName(isOpen?: boolean): string {
  return joinChipClasses(
    compactOverflowCountChipBaseClassName,
    "border-border-default text-text-secondary focus-visible:ring-accent bg-zinc-100 dark:bg-zinc-700",
    isOpen ? "ring-accent ring-2 ring-offset-1" : undefined,
  );
}

/**
 * Tailwind classes for compact card synonym "+N" overflow triggers; palette matches visible synonym chips.
 */
export function compactSynonymOverflowCountChipClassName(
  isOpen?: boolean,
): string {
  return joinChipClasses(
    compactOverflowCountChipBaseClassName,
    "border-rose-300/70 bg-rose-100 text-rose-900 focus-visible:ring-rose-400 dark:border-rose-500/40 dark:bg-rose-500/35 dark:text-rose-100 dark:focus-visible:ring-rose-500/60",
    isOpen
      ? "ring-2 ring-offset-1 ring-rose-400 dark:ring-rose-500/60"
      : undefined,
  );
}
