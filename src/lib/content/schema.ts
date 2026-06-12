import { z } from "zod";
import { BLOG_CATEGORY_SLUGS } from "~/lib/content/blog-categories";

/**
 * Normalizes frontmatter date values to an ISO calendar day (`YYYY-MM-DD`).
 *
 * Accepts `Date` instances from gray-matter and passes through string values
 * for downstream Zod validation.
 */
function preprocessCalendarDay(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

const calendarDaySchema = z.preprocess(
  preprocessCalendarDay,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
);

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
  lastReviewed: calendarDaySchema,
  draft: z.boolean().default(false),
});

/** Parsed and validated frontmatter for a wiki MDX document. */
export type WikiFrontmatter = z.infer<typeof wikiFrontmatterSchema>;

/**
 * Zod contract for blog MDX frontmatter parsed from `content/blog` MDX files.
 *
 * Invalid frontmatter fails at build or request time when entries are loaded,
 * surfacing the offending file path from the blog loader.
 */
export const blogCategorySchema = z.enum(BLOG_CATEGORY_SLUGS);

export const blogFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  date: calendarDaySchema,
  authors: z.array(z.string()).min(1),
  tags: z.array(z.string()).default([]),
  category: blogCategorySchema.default("releases"),
  heroImage: z.string().optional(),
  draft: z.boolean().default(false),
  teaser: z.union([z.boolean(), z.string()]).default(false),
});

/** Parsed and validated frontmatter for a blog MDX document. */
export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
