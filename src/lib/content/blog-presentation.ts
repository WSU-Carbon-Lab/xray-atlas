import GithubSlugger from "github-slugger";
import { toString } from "mdast-util-to-string";
import type { Heading } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { formatBlogDate } from "~/lib/content/blog-date-format";
import { blogSlugHash } from "~/lib/content/blog-slug-hash";

export { formatBlogDate, blogSlugHash };

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

/** Public URL prefix for blog post images served from `content/blog/blog-assets`. */
const BLOG_ASSETS_URL_PREFIX = "/blog/blog-assets";

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
