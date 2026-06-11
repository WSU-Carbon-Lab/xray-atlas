import { ringTemplateThumbnailSvg } from "../utils/ring-template-thumbnails";

/** Props for {@link RingTemplateThumbnail}. */
export interface RingTemplateThumbnailProps {
  /** Ring template preset id from {@link RING_TEMPLATE_PRESETS}. */
  templateId: string;
}

/**
 * Renders a static pre-baked structure thumbnail for a ring template menu row.
 * Bond strokes inherit `currentColor` from the parent; heteroatom labels use
 * CPK-aligned fills that switch with the document dark class.
 */
export function RingTemplateThumbnail({ templateId }: RingTemplateThumbnailProps) {
  const markup = ringTemplateThumbnailSvg(templateId);
  if (!markup) {
    return <span className="inline-block h-8 w-8 shrink-0" aria-hidden />;
  }

  return (
    <span
      className="ring-template-thumb text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center [&_svg]:block [&_svg]:h-full [&_svg]:w-full [&_.ring-thumb-hetero-n]:fill-[#2144d9] dark:[&_.ring-thumb-hetero-n]:fill-[#8fa3ff] [&_.ring-thumb-hetero-o]:fill-[#ff0d0d] dark:[&_.ring-thumb-hetero-o]:fill-[#ff6666] [&_.ring-thumb-hetero-s]:fill-[#c4a800] dark:[&_.ring-thumb-hetero-s]:fill-[#ffff00]"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
