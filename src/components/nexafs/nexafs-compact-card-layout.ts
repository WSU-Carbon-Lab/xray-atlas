/**
 * Shared layout tokens for `NexafsExperimentCompactCard` and
 * `NexafsExperimentCompactSkeleton` so the loading wireframe reserves the same
 * columns as the rendered browse/detail rows (aligned middle divider).
 */

/** Outer card shell (border, radius, container query). */
export const NEXAFS_COMPACT_CARD_SHELL_CLASS =
  "border-border-default dark:border-border-default @container/nexafscard flex w-full flex-col overflow-hidden rounded-2xl border bg-zinc-50 shadow-sm dark:bg-zinc-800";

/**
 * Fixed width for Cite | doi | To molecule | metrics | avatar rail | stats.
 * Sized to the packed action cluster (overlapping faces + overflow + add) with
 * tight gaps so rows do not leave a dead band before engagement stats.
 */
export const NEXAFS_COMPACT_CARD_ACTIONS_WIDTH_CLASS =
  "w-full @md/nexafscard:w-[30.25rem]";

/**
 * Header row: metadata (`minmax(0,1fr)`) | actions (fixed rem width).
 * Fixed columns keep the vertical divider at one horizontal position across rows.
 */
export const NEXAFS_COMPACT_CARD_ROW_CLASS =
  "grid w-full grid-cols-1 gap-3 p-3 @md/nexafscard:grid-cols-[minmax(0,1fr)_30.25rem] @md/nexafscard:items-center @md/nexafscard:gap-4";

/** Left: structure thumb + title/tags; right edge is the shared mid divider. */
export const NEXAFS_COMPACT_CARD_META_CLASS =
  "flex min-w-0 items-center gap-2 border-r border-zinc-200 pr-2 @md/nexafscard:gap-4 @md/nexafscard:pr-4 dark:border-zinc-600";

/** Right: Cite/doi, To molecule, metrics ring, avatars, engagement stats. */
export const NEXAFS_COMPACT_CARD_ACTIONS_CLASS =
  `relative z-30 flex ${NEXAFS_COMPACT_CARD_ACTIONS_WIDTH_CLASS} shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-3 border-t border-zinc-200 pt-3 @md/nexafscard:flex-nowrap @md/nexafscard:gap-y-0 @md/nexafscard:border-t-0 @md/nexafscard:pt-0 dark:border-zinc-600`;

/**
 * Compact instrument chip: short name only (full instrument|facility stays in the tooltip).
 * Caps width so long facility strings cannot stretch the meta column.
 */
export const NEXAFS_COMPACT_INSTRUMENT_CHIP_CLASS =
  "inline-flex h-4.5 max-w-[9.5rem] min-w-0 shrink items-center truncate rounded-full border px-1.5 font-medium";
