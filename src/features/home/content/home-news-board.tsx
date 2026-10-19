"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@heroui/styles";
import { BlogFeaturedAuthor } from "~/components/blog/blog-author-byline";
import { BlogPostImage } from "~/components/blog/blog-post-cards";
import { BlogTile } from "~/components/blog/blog-tile";
import {
  getBlogCategory,
  type BlogCategorySlug,
} from "~/lib/content/blog-categories";
import { formatBlogDate } from "~/lib/content/blog-date-format";
import type { BlogFrontmatterIndexEntry } from "~/lib/content/blog-loader";

/** One home-news post the board can preview. */
export interface HomeNewsItem {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: BlogCategorySlug;
  authors: string[];
  heroImage?: string;
  /** Draft shown on the home stage only. It does not link to a published post. */
  unpublished?: boolean;
}

/**
 * Unpublished Perspectives row. The words are real copy, drawn blurred, with a
 * placeholder frame instead of a hero image.
 */
const PERSPECTIVE_DRAFT: HomeNewsItem = {
  slug: "perspective-draft",
  title: "What the catalog is for",
  description:
    "A note on why a shared spectrum is more useful than another private folder of curves.",
  date: "",
  category: "perspectives",
  authors: [],
  unpublished: true,
};

/** One category row, with its newest post when one exists. */
export interface HomeNewsCategoryRow {
  slug: BlogCategorySlug;
  label: string;
  post: HomeNewsItem | null;
}

/**
 * Places the newest post in the middle of a three-post strip.
 *
 * Fewer than three posts stay in newest-first order.
 */
function withLatestCentered(posts: readonly HomeNewsItem[]): HomeNewsItem[] {
  const latest = posts[0];
  const second = posts[1];
  const third = posts[2];
  if (!latest || !second || !third) {
    return [...posts];
  }
  return [second, latest, third];
}

function asIndexEntry(item: HomeNewsItem): BlogFrontmatterIndexEntry {
  return {
    slug: item.slug,
    filePath: "",
    frontmatter: {
      title: item.title,
      description: item.description,
      date: item.date,
      authors: item.authors,
      tags: [],
      category: item.category,
      heroImage: item.heroImage,
      draft: false,
      teaser: false,
    },
  };
}

/**
 * Home news body.
 *
 * The newest three posts sit in a horizontal strip with the latest in the
 * center. Each category row states what that category is for. The right side
 * shows the image, title, and description of the post under the pointer.
 * Perspectives uses the unpublished draft image until a post exists.
 */
export function HomeNewsBoard({
  latest,
  categories,
}: {
  latest: readonly HomeNewsItem[];
  categories: readonly HomeNewsCategoryRow[];
}): ReactElement {
  const rows = categories.map((category) =>
    category.post || category.slug !== "perspectives"
      ? category
      : { ...category, post: PERSPECTIVE_DRAFT },
  );
  const [selectedSlug, setSelectedSlug] = useState(latest[0]?.slug ?? "");
  const posts = rows.flatMap((category) =>
    category.post ? [category.post] : [],
  );
  const selected =
    latest.find((post) => post.slug === selectedSlug) ??
    posts.find((post) => post.slug === selectedSlug) ??
    latest[0] ??
    null;
  const strip = withLatestCentered(latest);

  return (
    <div className="flex w-full flex-col gap-8">
      {strip.length > 0 ? (
        <div className="border-border divide-border grid snap-x snap-mandatory grid-cols-[repeat(3,minmax(12rem,1fr))] divide-x overflow-x-auto border-y">
          {strip.map((post) => {
            const active = post.slug === selected?.slug;
            return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                onMouseEnter={() => setSelectedSlug(post.slug)}
                onFocus={() => setSelectedSlug(post.slug)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "snap-center px-4 py-4 no-underline transition-colors sm:px-6 sm:py-5",
                  active ? "bg-surface" : "hover:bg-surface/60",
                )}
              >
                <time
                  dateTime={post.date}
                  className="text-muted text-xs tracking-wide uppercase"
                >
                  {formatBlogDate(post.date)}
                </time>
                <p
                  className={cn(
                    "mt-2 text-sm leading-6 sm:text-base",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted font-normal",
                  )}
                >
                  {post.title}
                </p>
              </Link>
            );
          })}
        </div>
      ) : null}
      <div className="grid w-full items-stretch gap-10 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)] lg:gap-x-12">
        <div className="min-w-0">
          <Link href="/blog" className="home-kicker mb-3 inline-block">
            News
          </Link>
          <div className="divide-border divide-y">
            {rows.map((category) => {
              const post = category.post;
              const purpose = getBlogCategory(category.slug)?.description ?? "";
              if (post?.unpublished) {
                return (
                  <button
                    key={category.slug}
                    type="button"
                    onMouseEnter={() => setSelectedSlug(post.slug)}
                    onFocus={() => setSelectedSlug(post.slug)}
                    className="group block w-full cursor-pointer border-0 bg-transparent py-3 text-left"
                  >
                    <CategoryLabel
                      label={category.label}
                      title={purpose}
                      active={post.slug === selected?.slug}
                    />
                  </button>
                );
              }
              return post ? (
                <Link
                  key={category.slug}
                  href={`/blog/${post.slug}`}
                  onMouseEnter={() => setSelectedSlug(post.slug)}
                  onFocus={() => setSelectedSlug(post.slug)}
                  className="group block w-full py-3 no-underline"
                >
                  <CategoryLabel
                    label={category.label}
                    title={purpose}
                    active={post.slug === selected?.slug}
                  />
                </Link>
              ) : (
                <div key={category.slug} className="py-3">
                  <span className="font-display text-muted block text-2xl leading-none font-normal tracking-tight sm:text-3xl">
                    {category.label}
                  </span>
                  <span className="text-muted mt-2 block max-w-sm text-sm leading-6">
                    Coming soon.
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {selected ? <HomeNewsPreview item={selected} /> : null}
      </div>
      <Link href="/about/roadmap" className="home-chip w-fit">
        Roadmap
      </Link>
    </div>
  );
}

function CategoryLabel({
  label,
  title,
  active,
}: {
  label: string;
  title: string;
  active: boolean;
}): ReactElement {
  return (
    <>
      <span className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-display text-2xl leading-none font-normal tracking-tight sm:text-3xl",
            active
              ? "text-foreground"
              : "text-muted group-hover:text-foreground",
          )}
        >
          {label}
        </span>
        <ArrowRightIcon
          className="size-5 shrink-0 opacity-0 transition-transform group-hover:translate-x-1 group-hover:opacity-60 group-focus-visible:translate-x-1 group-focus-visible:opacity-60 sm:size-6"
          aria-hidden
        />
      </span>
      <span className="text-muted mt-2 block max-w-sm text-sm leading-6">
        {title}
      </span>
    </>
  );
}

/**
 * Right-hand preview for the post selected on the home news stage.
 *
 * Shows the hero image or abstract tile, the category kicker, the calendar
 * date, the title, the description, and the lead author.
 */
function HomeNewsPreview({ item }: { item: HomeNewsItem }): ReactElement {
  const kicker = getBlogCategory(item.category)?.kicker ?? item.category;
  const body = (
    <>
      <div className="relative min-h-40 overflow-hidden sm:min-h-full">
        {item.unpublished ? (
          <BlogTile
            slug={item.slug}
            title="Unpublished perspective"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <BlogPostImage
            entry={asIndexEntry(item)}
            className="absolute inset-0 h-full w-full"
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-accent font-semibold tracking-[0.16em] uppercase">
            {kicker}
          </span>
          {item.unpublished || item.date.length === 0 ? (
            <span className="text-muted">Not yet published</span>
          ) : (
            <time dateTime={item.date} className="text-muted">
              {formatBlogDate(item.date)}
            </time>
          )}
        </div>
        {item.unpublished ? (
          <>
            <h2
              className="font-display text-foreground text-2xl leading-tight font-semibold tracking-tight blur-[6px] select-none sm:text-3xl"
              aria-hidden
            >
              {item.title}
            </h2>
            <p className="sr-only">Not yet published.</p>
            <p
              className="text-muted line-clamp-4 text-sm leading-6 blur-[5px] select-none"
              aria-hidden
            >
              {item.description}
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display text-foreground text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
              {item.title}
            </h2>
            <p className="text-muted line-clamp-4 text-sm leading-6">
              {item.description}
            </p>
            <BlogFeaturedAuthor authors={item.authors} linkable={false} />
            <span className="text-accent text-sm font-medium">Read post</span>
          </>
        )}
      </div>
    </>
  );
  return (
    <article className="border-border bg-surface min-h-64 overflow-hidden rounded-2xl border">
      {item.unpublished ? (
        <div className="grid h-full sm:grid-cols-2">{body}</div>
      ) : (
        <Link
          href={`/blog/${item.slug}`}
          className="grid h-full no-underline sm:grid-cols-2"
        >
          {body}
        </Link>
      )}
    </article>
  );
}
