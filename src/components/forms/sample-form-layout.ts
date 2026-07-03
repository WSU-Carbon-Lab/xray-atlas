/**
 * Shared layout tokens for NEXAFS sample information and extended preparation forms.
 */
export type SampleFormLayout = "inset" | "stacked";

export const sampleFormInsetRowClass =
  "flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6";

export const sampleFormInsetLabelClass =
  "text-foreground/85 flex flex-wrap items-center gap-1 text-[15px] leading-snug";

export const sampleFormInsetControlClass = "w-full min-w-0 sm:max-w-[58%]";

export type SampleFormLegacyAppearance = "form" | "inset";

/**
 * Maps legacy `form`/`inset` props to {@link SampleFormLayout} tokens.
 */
export function resolveSampleFormLayout(
  layout?: SampleFormLegacyAppearance,
  appearance?: SampleFormLegacyAppearance,
): SampleFormLayout {
  const value = layout ?? appearance ?? "form";
  return value === "inset" ? "inset" : "stacked";
}
