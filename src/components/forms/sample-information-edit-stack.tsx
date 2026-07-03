"use client";

import { SampleAuxAccordion } from "./SampleAuxAccordion";
import { NexafsSampleInformationSection } from "./nexafs-sample-information-section";
import type { NexafsSampleInformationSectionProps } from "./types";

export type SampleInformationEditStackProps = NexafsSampleInformationSectionProps & {
  hideAuxMethodSelectors?: boolean;
};

/**
 * Composes core sample information fields and extended preparation accordion for edit flows.
 */
export function SampleInformationEditStack({
  hideAuxMethodSelectors = true,
  linkedSampleAux,
  processMethod,
  layout = "inset",
  appearance,
  ...sectionProps
}: SampleInformationEditStackProps) {
  const accordionLayout = layout ?? appearance ?? "inset";

  if (!linkedSampleAux) {
    return (
      <NexafsSampleInformationSection
        linkedSampleAux={linkedSampleAux}
        processMethod={processMethod}
        {...sectionProps}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <NexafsSampleInformationSection
        linkedSampleAux={linkedSampleAux}
        processMethod={processMethod}
        {...sectionProps}
      />
      <SampleAuxAccordion
        layout={accordionLayout}
        value={linkedSampleAux.value}
        onChange={linkedSampleAux.onChange}
        processMethod={processMethod}
        hideMethodSelectors={hideAuxMethodSelectors}
        onProcessMethodChange={linkedSampleAux.onProcessMethodChange}
      />
    </div>
  );
}
