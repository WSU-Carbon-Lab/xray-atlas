import { cn } from "@heroui/styles";
import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import path from "node:path";
import rehypeCitation from "rehype-citation";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { MDXComponents } from "mdx/types";

const CONTENT_ROOT = path.join(process.cwd(), "content");

function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/**
 * Renders wiki MDX body content with math, GFM, heading slugs, KaTeX, and citations.
 *
 * Typography tokens match existing wiki pages (`text-foreground`, `text-muted`,
 * `text-accent`, `border-border`). Internal links use Next.js `Link`; external
 * links open in a new context with `rel="noopener noreferrer"`.
 */
export async function MdxArticle({
  source,
}: {
  source: string;
}): Promise<ReactElement> {
  return (
    <article className="w-full min-w-0 space-y-4">
      <MDXRemote
        source={source}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkMath, remarkGfm],
            rehypePlugins: [
              rehypeSlug,
              rehypeKatex,
              [
                rehypeCitation,
                {
                  bibliography: "references.bib",
                  path: CONTENT_ROOT,
                },
              ],
            ],
          },
        }}
        components={wikiMdxComponents}
      />
    </article>
  );
}

function MdxAnchor({
  href,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"a">): ReactElement {
  if (!href) {
    return <span>{children}</span>;
  }

  const mergedClassName = cn("text-accent hover:underline", className);

  if (isInternalHref(href)) {
    return (
      <Link href={href} className={mergedClassName} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={mergedClassName}
      rel="noopener noreferrer"
      target={href.startsWith("#") ? undefined : "_blank"}
      {...props}
    >
      {children}
    </a>
  );
}

function MdxTable({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"table">): ReactElement {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table
        className={cn("text-muted w-full min-w-[20rem] text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

/** Shared MDX component map for wiki articles. */
export const wikiMdxComponents: MDXComponents = {
  h1: ({ children, className, ...props }) => (
    <h1
      {...props}
      className={cn("text-foreground text-4xl font-bold", className)}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      {...props}
      className={cn("text-foreground mb-2 text-xl font-semibold", className)}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3
      {...props}
      className={cn("text-foreground mb-2 text-lg font-semibold", className)}
    >
      {children}
    </h3>
  ),
  p: ({ children, className, ...props }) => (
    <p {...props} className={cn("text-muted", className)}>
      {children}
    </p>
  ),
  ul: ({ children, className, ...props }) => (
    <ul
      {...props}
      className={cn("text-muted ml-6 list-disc space-y-1", className)}
    >
      {children}
    </ul>
  ),
  ol: ({ children, className, ...props }) => (
    <ol
      {...props}
      className={cn("text-muted ml-6 list-decimal space-y-1", className)}
    >
      {children}
    </ol>
  ),
  li: ({ children, className, ...props }) => (
    <li {...props} className={cn(className)}>
      {children}
    </li>
  ),
  a: MdxAnchor,
  table: MdxTable,
  thead: ({ children, className, ...props }) => (
    <thead
      {...props}
      className={cn("border-border bg-surface border-b", className)}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, className, ...props }) => (
    <tbody {...props} className={cn(className)}>
      {children}
    </tbody>
  ),
  tr: ({ children, className, ...props }) => (
    <tr
      {...props}
      className={cn("border-border border-b last:border-b-0", className)}
    >
      {children}
    </tr>
  ),
  th: ({ children, className, ...props }) => (
    <th
      {...props}
      className={cn("text-foreground px-3 py-2 text-left font-semibold", className)}
    >
      {children}
    </th>
  ),
  td: ({ children, className, ...props }) => (
    <td {...props} className={cn("px-3 py-2", className)}>
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => (
    <code {...props} className={cn("text-foreground", className)}>
      {children}
    </code>
  ),
  strong: ({ children, className, ...props }) => (
    <strong {...props} className={cn("text-foreground font-medium", className)}>
      {children}
    </strong>
  ),
  em: ({ children, className, ...props }) => (
    <em {...props} className={cn(className)}>
      {children}
    </em>
  ),
  blockquote: ({ children, className, ...props }) => (
    <blockquote
      {...props}
      className={cn("text-muted border-border border-l-4 pl-4", className)}
    >
      {children}
    </blockquote>
  ),
  hr: ({ className, ...props }) => (
    <hr {...props} className={cn("border-border", className)} />
  ),
  pre: ({ children, className, ...props }) => (
    <pre
      {...props}
      className={cn(
        "border-border bg-surface overflow-x-auto rounded-lg border p-4 text-sm",
        className,
      )}
    >
      {children}
    </pre>
  ),
};
