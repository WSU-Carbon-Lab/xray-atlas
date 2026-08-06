import {
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
} from "bun:test";
import type { BlogEntry } from "~/lib/content/blog-loader";
import { adjacentBlogPosts } from "~/lib/content/blog-series";
import type { BlogFrontmatter } from "~/lib/content/schema";

type ExpectAssertions = {
  toBe: (expected: unknown) => void;
  toEqual: (expected: unknown) => void;
  toBeUndefined: () => void;
};

const describe = bunDescribe as (name: string, fn: () => void) => void;
const it = bunIt as (name: string, fn: () => void | Promise<void>) => void;
const expect = bunExpect as (value: unknown) => ExpectAssertions;

function blogEntry(
  slug: string,
  frontmatter: BlogFrontmatter,
): BlogEntry {
  return {
    slug,
    filePath: `/content/blog/${slug}.mdx`,
    frontmatter,
    body: "",
  };
}

const seriesFrontmatter = (
  part: number,
  overrides: Partial<BlogFrontmatter> = {},
): BlogFrontmatter => ({
  title: `Part ${part}`,
  description: `Part ${part} description`,
  date: `2026-06-${String(part).padStart(2, "0")}`,
  authors: ["Author"],
  tags: [],
  category: "guides",
  draft: false,
  teaser: false,
  series: { name: "Public beta", part },
  ...overrides,
});

describe("adjacentBlogPosts", () => {
  it("maps series previous to the lower part and next to the higher part", () => {
    const entries = [2, 3, 4, 5].map((part) =>
      blogEntry(`beta-part-${part}`, seriesFrontmatter(part)),
    );

    const { previous, next } = adjacentBlogPosts(
      entries,
      "beta-part-4",
      seriesFrontmatter(4),
    );

    expect(previous).toEqual({ slug: "beta-part-3", title: "Part 3" });
    expect(next).toEqual({ slug: "beta-part-5", title: "Part 5" });
  });

  it("omits series previous on the first part and next on the last part", () => {
    const entries = [1, 2, 3].map((part) =>
      blogEntry(`beta-part-${part}`, seriesFrontmatter(part)),
    );

    const first = adjacentBlogPosts(
      entries,
      "beta-part-1",
      seriesFrontmatter(1),
    );
    expect(first.previous).toBeUndefined();
    expect(first.next).toEqual({ slug: "beta-part-2", title: "Part 2" });

    const last = adjacentBlogPosts(
      entries,
      "beta-part-3",
      seriesFrontmatter(3),
    );
    expect(last.previous).toEqual({ slug: "beta-part-2", title: "Part 2" });
    expect(last.next).toBeUndefined();
  });

  it("maps category previous to the older post and next to the newer post", () => {
    const noSeries = (title: string, date: string): BlogFrontmatter => ({
      title,
      description: `${title} description`,
      date,
      authors: ["Author"],
      tags: [],
      category: "technical",
      draft: false,
      teaser: false,
    });

    const entries = [
      blogEntry("newest", noSeries("Newest", "2026-07-10")),
      blogEntry("middle", noSeries("Middle", "2026-07-05")),
      blogEntry("oldest", noSeries("Oldest", "2026-07-01")),
    ];

    const { previous, next } = adjacentBlogPosts(
      entries,
      "middle",
      noSeries("Middle", "2026-07-05"),
    );

    expect(previous).toEqual({ slug: "oldest", title: "Oldest" });
    expect(next).toEqual({ slug: "newest", title: "Newest" });
  });
});
