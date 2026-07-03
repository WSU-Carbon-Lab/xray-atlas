import type { SampleFormLayout } from "./sample-form-layout";

const accordionItemClass = "rounded-lg [&+&]:mt-1";
const accordionTriggerClass =
  "flex min-h-11 w-full items-center gap-2 rounded-lg px-4 py-3 text-start";
const accordionBodyGridClass =
  "grid min-w-0 gap-4 px-4 py-3 sm:grid-cols-2";
const accordionBodySpinGridClass =
  "grid min-w-0 gap-4 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3";
const accordionBodyStackClass = "grid min-w-0 gap-4 px-4 py-3";

const insetAccordionItemClass =
  "border-border/50 bg-surface-2/40 overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm";

const insetAccordionTriggerClass =
  "flex min-h-0 w-full items-center gap-2 px-4 py-3.5 text-start";

const insetAccordionBodyClass = "grid min-w-0 gap-4 px-4 py-4 sm:grid-cols-2";

const insetAccordionBodySpinClass =
  "grid min-w-0 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3";

export type SampleAuxAccordionChrome = {
  itemClass: string;
  triggerClass: string;
  bodyGridClass: string;
  bodySpinGridClass: string;
  bodyStackGridClass: string;
  rootClass: string;
};

/**
 * Resolves accordion surface classes for stacked vs inset sample preparation layouts.
 */
export function sampleAuxAccordionChrome(
  layout: SampleFormLayout = "inset",
): SampleAuxAccordionChrome {
  const isInset = layout === "inset";
  return {
    itemClass: isInset ? insetAccordionItemClass : accordionItemClass,
    triggerClass: isInset ? insetAccordionTriggerClass : accordionTriggerClass,
    bodyGridClass: isInset ? insetAccordionBodyClass : accordionBodyGridClass,
    bodySpinGridClass: isInset
      ? insetAccordionBodySpinClass
      : accordionBodySpinGridClass,
    bodyStackGridClass: isInset ? insetAccordionBodyClass : accordionBodyStackClass,
    rootClass: isInset
      ? "flex w-full flex-col gap-3 bg-transparent p-0 shadow-none"
      : "w-full rounded-lg",
  };
}
