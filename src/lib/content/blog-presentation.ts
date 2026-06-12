import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/** Public URL prefix for blog post images; kept inline so client components can import date helpers. */
const BLOG_ASSETS_URL_PREFIX = "/blog/blog-assets";

function hashSlug(slug: string): number {
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash * 31 + slug.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Returns a deterministic opaque hash for a blog slug used in teaser tiles without
 * exposing the slug in the DOM.
 */
export function blogSlugHash(slug: string): string {
  const hash = hashSlug(slug);
  return hash.toString(16).padStart(8, "0");
}

/** One in-page heading extracted from blog MDX for table-of-contents links. */
export interface BlogHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

const WORDS_PER_MINUTE = 225;

/**
 * Estimates reading time in whole minutes from MDX body text.
 *
 * Strips JSX comments, fenced code blocks, inline code, and image/link markup before
 * counting words. Returns at least one minute.
 */
export function readingTimeMinutes(body: string): number {
  let text = body;
  text = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  text = text.replace(/^---[\s\S]*?---\n?/m, "");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`\n]+`/g, " ");
  text = text.replace(/!\[[^\]]*]\([^)]+\)/g, " ");
  text = text.replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
  text = text.replace(/[#>*_~|-]/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/**
 * Formats a blog calendar day (`YYYY-MM-DD`) for display.
 *
 * When `relative` is true and the post is within the last 14 days, returns compact
 * relative labels (`Today`, `Yesterday`, `N days ago`). Otherwise returns a long-form
 * US locale date. On statically generated blog routes, relative strings reflect the
 * build timestamp until the next deployment.
 */
export function formatBlogDate(
  isoDate: string,
  options?: { relative?: boolean; now?: Date },
): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  const now = options?.now ?? new Date();

  if (options?.relative) {
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 14) {
      if (diffDays === 0) {
        return "Today";
      }
      if (diffDays === 1) {
        return "Yesterday";
      }
      return `${diffDays} days ago`;
    }
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Parses MDX body markdown and returns `h2`/`h3` headings with ids matching
 * `rehype-slug` / `github-slugger` slug rules used when rendering blog MDX.
 */
export function extractHeadings(body: string): BlogHeading[] {
  const tree = unified().use(remarkParse).parse(body);
  const slugger = new GithubSlugger();
  const headings: BlogHeading[] = [];

  visit(tree, "heading", (node: Heading) => {
    if (node.depth !== 2 && node.depth !== 3) {
      return;
    }
    const text = toString(node).trim();
    if (!text) {
      return;
    }
    headings.push({
      id: slugger.slug(text),
      text,
      level: node.depth,
    });
  });

  return headings;
}

/**
 * Maps blog frontmatter `heroImage` values to public URLs under `/blog/blog-assets`.
 */
export function resolveBlogHeroImageUrl(heroImage: string): string {
  if (
    heroImage.startsWith("http://") ||
    heroImage.startsWith("https://") ||
    heroImage.startsWith("/")
  ) {
    return heroImage;
  }

  const normalized = heroImage.replace(/^\.\//, "");
  if (normalized.startsWith("blog-assets/")) {
    return `${BLOG_ASSETS_URL_PREFIX}/${normalized.slice("blog-assets/".length)}`;
  }

  return `${BLOG_ASSETS_URL_PREFIX}/${normalized}`;
}
