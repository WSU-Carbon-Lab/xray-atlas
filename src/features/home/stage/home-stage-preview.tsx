import type { ReactElement, ReactNode } from "react";

export interface HomeStagePreviewProps {
  /** One or two sentences shown above the preview. */
  caption: string;
  /** Feature preview. Fills the space under the caption. */
  children: ReactNode;
}

/**
 * Caption and body for one home feature.
 *
 * The caption keeps a two-line measure so Collaboration, Data, Catalog, and
 * Provenance stay the same height. The body is not framed.
 */
export function HomeStagePreview({
  caption,
  children,
}: HomeStagePreviewProps): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <p className="text-muted min-h-12 max-w-xl shrink-0 text-sm leading-6">
        {caption}
      </p>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">{children}</div>
      </div>
    </div>
  );
}
