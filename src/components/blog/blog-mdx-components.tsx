import { cn } from "@heroui/styles";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { MDXComponents } from "mdx/types";
import { resolveBlogHeroImageUrl } from "~/lib/content/blog-presentation";

/**
 * Renders a blog MDX image as a figure with optional caption from alt text.
 */
export function BlogMdxImage({
  src,
  alt,
  className,
  ...props
}: ComponentPropsWithoutRef<"img">): ReactElement | null {
  const imageSrc = typeof src === "string" ? resolveBlogHeroImageUrl(src) : undefined;
  if (!imageSrc) {
    return null;
  }
  const imageAlt = typeof alt === "string" ? alt : "";
  return (
    <figure className="my-8 space-y-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={imageAlt}
        className={cn(
          "border-border w-full rounded-xl border object-cover",
          className,
        )}
        {...props}
      />
      {imageAlt ? (
        <figcaption className="text-muted text-center text-sm">
          {imageAlt}
        </figcaption>
      ) : null}
    </figure>
  );
}

const BLOG_MDX_PARAGRAPH_CLASS =
  "text-muted text-[1.05rem] leading-8";

function isWhitespaceMdxText(node: ReactNode): boolean {
  return typeof node === "string" && node.trim() === "";
}

/**
 * Returns whether a React element is the blog MDX image component or another
 * node that will render block-level figure or img markup.
 */
function isMdxBlockMediaElement(node: ReactElement): boolean {
  if (
    node.type === BlogMdxImage ||
    node.type === "img" ||
    node.type === "figure"
  ) {
    return true;
  }
  const props = node.props as { src?: unknown };
  return typeof props.src === "string" && props.src.length > 0;
}

/**
 * Recursively scans MDX paragraph children for image or figure elements that
 * must not be nested inside `<p>`.
 */
function containsMdxBlockMedia(children: ReactNode): boolean {
  for (const node of Children.toArray(children)) {
    if (isWhitespaceMdxText(node)) {
      continue;
    }
    if (!isValidElement(node)) {
      continue;
    }
    if (isMdxBlockMediaElement(node)) {
      return true;
    }
    const nested = (node.props as { children?: ReactNode }).children;
    if (nested !== undefined && containsMdxBlockMedia(nested)) {
      return true;
    }
  }
  return false;
}

/**
 * Returns whether MDX wrapped only an image in a paragraph (ignoring whitespace
 * text nodes), which should render without an extra paragraph wrapper.
 */
function isImageOnlyMdxParagraph(children: ReactNode): boolean {
  const nodes = Children.toArray(children).filter(
    (node) => !isWhitespaceMdxText(node),
  );
  if (nodes.length !== 1) {
    return false;
  }
  const sole = nodes[0];
  return isValidElement(sole) && isMdxBlockMediaElement(sole);
}

function BlogMdxParagraph({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"p">): ReactElement {
  if (isImageOnlyMdxParagraph(children)) {
    return <>{children}</>;
  }
  if (containsMdxBlockMedia(children)) {
    return (
      <div
        {...props}
        className={cn(BLOG_MDX_PARAGRAPH_CLASS, className)}
      >
        {children}
      </div>
    );
  }
  return (
    <p
      {...props}
      className={cn(BLOG_MDX_PARAGRAPH_CLASS, className)}
    >
      {children}
    </p>
  );
}

/** MDX component overrides for blog post body typography and media. */
export const blogMdxComponents: MDXComponents = {
  img: BlogMdxImage,
  h1: ({ children, className, ...props }) => (
    <h1
      {...props}
      className={cn(
        "font-display text-foreground mt-10 scroll-mt-24 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
    >
      {children}
    </h1>
  ),
  h2: ({ children, className, ...props }) => (
    <h2
      {...props}
      className={cn(
        "font-display text-foreground mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h2>
  ),
  h3: ({ children, className, ...props }) => (
    <h3
      {...props}
      className={cn(
        "font-display text-foreground mt-8 scroll-mt-24 text-xl font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h3>
  ),
  h4: ({ children, className, ...props }) => (
    <h4
      {...props}
      className={cn(
        "font-display text-foreground mt-6 scroll-mt-24 text-lg font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h4>
  ),
  h5: ({ children, className, ...props }) => (
    <h5
      {...props}
      className={cn(
        "font-display text-foreground mt-6 scroll-mt-24 text-base font-semibold tracking-tight",
        className,
      )}
    >
      {children}
    </h5>
  ),
  h6: ({ children, className, ...props }) => (
    <h6
      {...props}
      className={cn(
        "font-display text-muted mt-6 scroll-mt-24 text-sm font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </h6>
  ),
  p: BlogMdxParagraph,
};
