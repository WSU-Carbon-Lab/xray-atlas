"use client";

import type { ComponentType, SVGProps } from "react";
import {
  ArrowPathIcon,
  BeakerIcon,
  BuildingStorefrontIcon,
  CloudIcon,
  CubeIcon,
  DocumentTextIcon,
  FireIcon,
  ScaleIcon,
  Square3Stack3DIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import type {
  SampleMetadataDisplayRow,
  SampleMetadataDisplaySection,
} from "~/lib/sample-metadata-display";
import {
  SampleMetadataInsetGroup,
  SampleMetadataSectionCaption,
} from "~/components/nexafs/sample-metadata-chrome-shared";

type SampleMetadataIcon = ComponentType<SVGProps<SVGSVGElement>>;

const SECTION_ICON_BY_TITLE: Record<string, SampleMetadataIcon> = {
  Preparation: BeakerIcon,
  Vendor: BuildingStorefrontIcon,
  Processing: WrenchScrewdriverIcon,
  "Spin coating": ArrowPathIcon,
  "Blade coating": Square3Stack3DIcon,
  "Vacuum deposition": CloudIcon,
  "Solution chemistry": BeakerIcon,
  "Substrate detail": CubeIcon,
  Atmosphere: CloudIcon,
  Annealing: FireIcon,
  Notes: DocumentTextIcon,
};

const FIELD_ICON_BY_LABEL: Record<string, SampleMetadataIcon> = {
  "Process method": WrenchScrewdriverIcon,
  Substrate: CubeIcon,
  Solvent: BeakerIcon,
  "Thickness (nm)": Square3Stack3DIcon,
  "Molecular weight (g/mol)": ScaleIcon,
  Vendor: BuildingStorefrontIcon,
  "Processing branch": ArrowPathIcon,
  "Wet method": BeakerIcon,
  "Dry method": CloudIcon,
};

/**
 * Resolves the section icon for a sample metadata group title; falls back to a neutral document icon.
 */
export function sampleMetadataSectionIcon(title: string): SampleMetadataIcon {
  return SECTION_ICON_BY_TITLE[title] ?? DocumentTextIcon;
}

/**
 * Resolves the field icon for a sample metadata label; falls back to the section icon when provided.
 */
export function sampleMetadataFieldIcon(
  label: string,
  sectionTitle?: string,
): SampleMetadataIcon {
  return (
    FIELD_ICON_BY_LABEL[label] ??
    (sectionTitle ? sampleMetadataSectionIcon(sectionTitle) : DocumentTextIcon)
  );
}

function SampleMetadataInsetRow({
  row,
  sectionTitle,
}: {
  row: SampleMetadataDisplayRow;
  sectionTitle?: string;
}) {
  const FieldIcon = sampleMetadataFieldIcon(row.label, sectionTitle);

  return (
    <div className="flex min-w-0 items-start gap-3 px-4 py-3.5 sm:items-center">
      <FieldIcon
        className="text-muted mt-0.5 h-[18px] w-[18px] shrink-0 stroke-[1.5] sm:mt-0"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <dt className="text-foreground/85 shrink-0 text-[15px] leading-snug">
          {row.label}
        </dt>
        <dd className="text-muted min-w-0 text-[15px] leading-snug break-words sm:max-w-[58%] sm:text-right">
          {row.href ? (
            <a
              href={row.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {row.value}
            </a>
          ) : (
            row.value
          )}
        </dd>
      </div>
    </div>
  );
}

function SampleMetadataReadSection({
  section,
  hideCaption = false,
}: {
  section: SampleMetadataDisplaySection;
  hideCaption?: boolean;
}) {
  if (section.rows.length === 0) {
    return null;
  }

  const sectionId = `sample-section-${section.title.replace(/\s+/g, "-")}`;

  return (
    <section aria-labelledby={sectionId}>
      {hideCaption ? (
        <p className="text-muted/80 mb-1.5 px-1 text-xs font-medium">{section.title}</p>
      ) : (
        <SampleMetadataSectionCaption title={section.title} />
      )}
      <SampleMetadataInsetGroup ariaLabel={section.title}>
        <dl id={sectionId}>
          {section.rows.map((row) => (
            <SampleMetadataInsetRow
              key={`${section.title}-${row.label}`}
              row={row}
              sectionTitle={section.title}
            />
          ))}
        </dl>
      </SampleMetadataInsetGroup>
    </section>
  );
}

export function SampleMetadataSectionBlock({
  section,
  hideCaption = false,
}: {
  section: SampleMetadataDisplaySection;
  hideCaption?: boolean;
  variant?: "core" | "extended";
}) {
  return <SampleMetadataReadSection section={section} hideCaption={hideCaption} />;
}

export function SampleMetadataPanelHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-foreground text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted mt-1 max-w-2xl text-[13px] leading-relaxed">{description}</p>
    </div>
  );
}

export function SampleMetadataReadView({
  coreSections,
  extendedSections,
  extendedRowCount,
  canEdit,
}: {
  coreSections: SampleMetadataDisplaySection[];
  extendedSections: SampleMetadataDisplaySection[];
  extendedRowCount: number;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {coreSections.map((section) => (
        <SampleMetadataReadSection key={section.title} section={section} />
      ))}

      {extendedSections.length > 0 ? (
        <section aria-labelledby="nexafs-sample-extended-heading" className="flex flex-col gap-3">
          <SampleMetadataSectionCaption
            title="Extended preparation"
            trailing={`${extendedRowCount} detail${extendedRowCount === 1 ? "" : "s"}`}
          />
          <div
            id="nexafs-sample-extended-heading"
            className="flex flex-col gap-4"
          >
            {extendedSections.map((section) => (
              <SampleMetadataReadSection
                key={`extended-${section.title}`}
                section={section}
                hideCaption
              />
            ))}
          </div>
        </section>
      ) : canEdit ? (
        <SampleMetadataEmptyExtendedHint />
      ) : null}
    </div>
  );
}

export function SampleMetadataExtendedHeading({
  fieldCount,
}: {
  fieldCount: number;
}) {
  return (
    <SampleMetadataSectionCaption
      title="Extended preparation"
      trailing={`${fieldCount} detail${fieldCount === 1 ? "" : "s"}`}
    />
  );
}

export function SampleMetadataEmptyExtendedHint() {
  return (
    <div className="border-border/40 rounded-2xl border border-dashed px-5 py-7 text-center">
      <p className="text-muted text-[13px] leading-relaxed">
        No extended preparation details yet.
      </p>
      <p className="text-muted/70 mt-1 text-xs leading-relaxed">
        Edit to add spin coating, solution chemistry, annealing, and other metadata.
      </p>
    </div>
  );
}

export function SampleMetadataEmptyState() {
  return (
    <div className="border-border/40 flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <BeakerIcon
        className="text-muted/60 h-8 w-8 stroke-[1.25]"
        aria-hidden
      />
      <p className="text-muted text-[13px]">No sample details were recorded for this dataset.</p>
    </div>
  );
}

export function SampleMetadataField({
  row,
  sectionTitle,
}: {
  row: SampleMetadataDisplayRow;
  sectionTitle?: string;
}) {
  return <SampleMetadataInsetRow row={row} sectionTitle={sectionTitle} />;
}
