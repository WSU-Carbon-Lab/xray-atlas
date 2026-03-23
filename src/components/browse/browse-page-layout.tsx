"use client";

type BrowsePageLayoutProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export const BROWSE_CONTENT_CLASS = "mx-auto w-full max-w-7xl px-4 py-8";

export function BrowsePageLayout({
  title,
  subtitle,
  children,
}: BrowsePageLayoutProps) {
  return (
    <div className={BROWSE_CONTENT_CLASS}>
      <div className="mb-8">
        <h1 className="text-foreground mb-4 text-3xl font-bold sm:text-4xl">
          {title}
        </h1>
        <p className="text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
