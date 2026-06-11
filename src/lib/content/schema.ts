import { z } from "zod";

/**
 * Zod contract for wiki MDX frontmatter parsed from `content/wiki` MDX files.
 *
 * Invalid frontmatter fails at build or request time when entries are loaded,
 * surfacing the offending file path from the wiki loader.
 */
export const wikiFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  order: z.number().int().default(0),
  authors: z.array(z.string()).default([]),
  lastReviewed: z.preprocess(
    (value) => {
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
      }
      return value;
    },
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "lastReviewed must be YYYY-MM-DD"),
  ),
  draft: z.boolean().default(false),
});

/** Parsed and validated frontmatter for a wiki MDX document. */
export type WikiFrontmatter = z.infer<typeof wikiFrontmatterSchema>;
