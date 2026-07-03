"use client";

export type SampleInformationSectionHeadingProps = {
  title?: string;
  description?: string;
};

const DEFAULT_TITLE = "2. Sample Information";
const DEFAULT_DESCRIPTION =
  "Optional context describing the specimen used across your experiments. None of these fields are required to submit.";

/**
 * Renders contribute-style sample information section chrome above inset field groups.
 */
export function SampleInformationSectionHeading({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
}: SampleInformationSectionHeadingProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-foreground text-xl font-semibold">{title}</h2>
      <p className="text-muted text-sm">{description}</p>
    </div>
  );
}
