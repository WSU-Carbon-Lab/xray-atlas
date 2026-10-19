import type { ReactElement } from "react";

/** Home stages in document order. Jump lists above and below a stage use this sequence. */
export const HOME_SECTIONS = [
  { id: "home-search", href: "#home-search", label: "Search" },
  { id: "home-features", href: "#home-features", label: "Features" },
  { id: "home-docs", href: "#home-docs", label: "Documentation" },
  { id: "home-news", href: "#home-news", label: "News" },
] as const;

/** Id of one home stage. */
export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/**
 * Renders the stages on one side of the current stage, in document order.
 *
 * `edge: "above"` lists every stage before `currentId`. `edge: "below"` lists
 * every stage after it. An empty side renders nothing.
 */
export function HomeStageJumpList({
  currentId,
  edge,
  className,
}: {
  currentId: HomeSectionId;
  edge: "above" | "below";
  className?: string;
}): ReactElement | null {
  const index = HOME_SECTIONS.findIndex((section) => section.id === currentId);
  const sections =
    edge === "above"
      ? HOME_SECTIONS.slice(0, index)
      : HOME_SECTIONS.slice(index + 1);
  if (sections.length === 0) {
    return null;
  }
  const slot =
    className ?? (edge === "above" ? "home-stage__back" : "home-stage__next");
  return (
    <nav
      aria-label={edge === "above" ? "Sections above" : "Sections below"}
      className={slot}
    >
      <ol className="mx-auto flex w-max list-none items-center p-0">
        {sections.map((section, itemIndex) => (
          <li key={section.id} className="flex items-center">
            {itemIndex > 0 ? (
              <span aria-hidden className="text-muted/50 px-3">
                |
              </span>
            ) : null}
            <a
              href={section.href}
              className="text-muted hover:text-foreground no-underline"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
