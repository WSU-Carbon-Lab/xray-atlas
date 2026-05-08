/**
 * Wiki documentation chrome: docked sticky rails whose headers merge the rail toggle with
 * the section title (Overview / On this page), standard rounded-xl chrome, and scrollable
 * bodies. Narrow viewports use drawers with breadcrumb icon triggers. Overview lists each
 * wiki route as an accordion item with links to the page top and section anchors (see
 * `wiki-doc-nav` section metadata).
 */

"use client";

import {
  ArrowUpTrayIcon,
  BookOpenIcon,
  ChevronDownIcon,
  CircleStackIcon,
  ListBulletIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  Accordion,
  Breadcrumbs,
  Button,
  Drawer,
  Tooltip,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  wikiDocTopicForPathname,
  wikiDocTopics,
  type WikiOverviewNavIcon,
} from "~/lib/wiki-doc-nav";

const STORAGE_LEFT = "xray-atlas-wiki-aside-left";
const STORAGE_RIGHT = "xray-atlas-wiki-aside-right";

const WIKI_DOCS_TOP_OFFSET = "5rem";
const WIKI_DOCS_PANEL_BOTTOM_GAP = "1rem";
const WIKI_DOCS_PANEL_HEIGHT = `calc(100dvh - ${WIKI_DOCS_TOP_OFFSET} - ${WIKI_DOCS_PANEL_BOTTOM_GAP})`;

const wikiRailTooltipClass =
  "bg-foreground text-background rounded-lg px-3 py-2 text-sm shadow-lg";

interface WikiTocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

interface WikiDocShellProps {
  /** Article body rendered inside `[data-wiki-main]` for outline scanning. */
  children: ReactNode;
}

function OverviewNavIcon({ kind }: { kind: WikiOverviewNavIcon }): ReactElement {
  const cls = "text-accent size-4 shrink-0";
  switch (kind) {
    case "wiki-home":
      return <BookOpenIcon className={cls} aria-hidden />;
    case "data-representation":
      return <CircleStackIcon className={cls} aria-hidden />;
    case "platform-features":
      return <SparklesIcon className={cls} aria-hidden />;
    case "contributions":
      return <ArrowUpTrayIcon className={cls} aria-hidden />;
    default:
      return <BookOpenIcon className={cls} aria-hidden />;
  }
}

function navLinkClass(active: boolean, dense?: boolean): string {
  return (
    cn(
      "block rounded-md text-sm transition-colors",
      dense ? "py-1 pl-2" : "py-1.5 pl-2",
      active
        ? "bg-accent/12 text-accent border-accent border-l-2 font-medium"
        : "text-muted hover:bg-default hover:text-foreground border-l-2 border-transparent",
    ) ?? ""
  );
}

function WikiOverviewAccordion({
  pathname,
  hashId,
  expandedKeys,
  onExpandedChange,
  onNavigate,
}: {
  pathname: string;
  hashId: string;
  expandedKeys: Set<string>;
  onExpandedChange: (keys: Set<string>) => void;
  onNavigate?: () => void;
}): ReactElement {
  return (
    <Accordion
      allowsMultipleExpanded
      className="w-full rounded-lg"
      expandedKeys={expandedKeys}
      variant="surface"
      onExpandedChange={(keys) => {
        onExpandedChange(new Set([...keys].map(String)));
      }}
    >
      {wikiDocTopics.map((topic) => {
        const isActivePage = pathname === topic.href;
        return (
          <Accordion.Item key={topic.href} id={topic.href}>
            <Accordion.Heading>
              <Accordion.Trigger
                className={cn(
                  "text-sm flex w-full items-center gap-3",
                  isActivePage && "text-accent font-medium",
                )}
              >
                <OverviewNavIcon kind={topic.overviewNavIcon} />
                <span className="min-w-0 flex-1 text-left">{topic.label}</span>
                <Accordion.Indicator>
                  <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="flex flex-col gap-1 pt-0">
                <Link
                  href={topic.href}
                  className={navLinkClass(isActivePage && hashId === "", true)}
                  onClick={onNavigate}
                >
                  Top of page
                </Link>
                {topic.sections.map((section) => {
                  const sectionActive =
                    isActivePage && hashId === section.id;
                  return (
                    <Link
                      key={section.id}
                      href={`${topic.href}#${section.id}`}
                      className={navLinkClass(sectionActive, true)}
                      onClick={onNavigate}
                    >
                      {section.label}
                    </Link>
                  );
                })}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

function WikiOnPageOutline({
  entries,
  activeId,
  onNavigate,
}: {
  entries: WikiTocEntry[];
  activeId: string | null;
  onNavigate?: () => void;
}): ReactElement {
  if (entries.length === 0) {
    return (
      <p className="text-muted px-1 text-sm leading-relaxed">
        No section headings with anchors on this page.
      </p>
    );
  }

  return (
    <nav aria-label="On this page" className="flex flex-col gap-0.5">
      {entries.map((entry) => {
        const active = activeId === entry.id;
        return (
          <a
            key={entry.id}
            href={`#${entry.id}`}
            onClick={onNavigate}
            className={cn(
              "block rounded-md py-1 text-sm transition-colors",
              entry.depth === 3 ? "pl-4" : "pl-2",
              active
                ? "text-accent border-accent border-l-2 font-medium"
                : "text-muted hover:text-foreground border-border border-l-2 border-transparent",
            )}
          >
            {entry.text}
          </a>
        );
      })}
    </nav>
  );
}

function outlineFromMain(root: HTMLElement | null): WikiTocEntry[] {
  if (!root) {
    return [];
  }

  const headings = root.querySelectorAll<HTMLHeadingElement>("h2[id], h3[id]");
  return Array.from(headings).map((heading) => ({
    id: heading.id,
    text: heading.textContent?.trim() ?? "",
    depth: heading.tagName === "H2" ? 2 : 3,
  }));
}

function OnThisPageAccordion({
  toc,
  activeHeadingId,
  onNavigate,
}: {
  toc: WikiTocEntry[];
  activeHeadingId: string | null;
  onNavigate?: () => void;
}): ReactElement {
  return (
    <Accordion className="w-full rounded-lg" variant="surface">
      <Accordion.Item defaultExpanded id="wiki-on-this-page">
        <Accordion.Heading>
          <Accordion.Trigger className="text-sm font-semibold flex w-full items-center gap-3">
            <ListBulletIcon className="text-accent size-5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 text-left">On this page</span>
            <Accordion.Indicator>
              <ChevronDownIcon className="size-4 shrink-0" aria-hidden />
            </Accordion.Indicator>
          </Accordion.Trigger>
        </Accordion.Heading>
        <Accordion.Panel>
          <Accordion.Body className="pt-0">
            <WikiOnPageOutline
              entries={toc}
              activeId={activeHeadingId}
              onNavigate={onNavigate}
            />
          </Accordion.Body>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function WikiRailDock({
  side,
  label,
  icon,
  panelOpen,
  onTogglePress,
  panelWidthClass,
  children,
}: {
  side: "left" | "right";
  label: string;
  icon: ReactElement;
  panelOpen: boolean;
  onTogglePress: () => void;
  panelWidthClass: string;
  children: ReactNode;
}): ReactElement {
  const tipPlacement = side === "left" ? "right" : "left";
  const minimized = !panelOpen;
  const headerRow =
    side === "left"
      ? "flex flex-row items-center"
      : "flex flex-row-reverse items-center";

  return (
    <div
      className={cn(
        "border-border bg-default/25 sticky z-[1] hidden min-h-0 shrink-0 flex-col overflow-hidden border shadow-sm lg:flex",
        minimized ? "w-max rounded-full" : "rounded-xl",
        panelOpen ? panelWidthClass : null,
      )}
      style={{
        alignSelf: "flex-start",
        top: WIKI_DOCS_TOP_OFFSET,
        maxHeight: WIKI_DOCS_PANEL_HEIGHT,
      }}
    >
      <div
        className={cn(
          "border-border bg-surface/90 flex shrink-0 items-center",
          headerRow,
          minimized ? "gap-0 p-1" : "gap-2 border-b px-2 py-2",
        )}
      >
        <Tooltip delay={150}>
          <Button
            isIconOnly
            aria-expanded={panelOpen}
            aria-label={
              panelOpen ? `Collapse ${label}` : `Expand ${label}`
            }
            className={cn(
              "border-border bg-background text-foreground hover:bg-default shrink-0 border",
              minimized
                ? "size-8 rounded-full"
                : "size-9 rounded-lg",
              panelOpen &&
                "border-accent bg-accent/15 text-accent ring-accent/25 ring-2",
            )}
            variant="outline"
            onPress={onTogglePress}
          >
            {icon}
          </Button>
          <Tooltip.Content
            className={wikiRailTooltipClass}
            placement={tipPlacement}
          >
            {label}
          </Tooltip.Content>
        </Tooltip>
        {panelOpen ? (
          <span
            className={cn(
              "text-foreground min-w-0 text-sm font-semibold tracking-tight",
              side === "left" ? "flex-1 text-left" : "flex-1 text-right",
            )}
          >
            {label}
          </span>
        ) : null}
      </div>
      {panelOpen ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-2 pb-3 pt-2 [scrollbar-gutter:stable]">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function WikiMobileRailTriggers({
  overviewOpen,
  outlineOpen,
  onOverviewPress,
  onOutlinePress,
}: {
  overviewOpen: boolean;
  outlineOpen: boolean;
  onOverviewPress: () => void;
  onOutlinePress: () => void;
}): ReactElement {
  return (
    <div className="flex shrink-0 gap-2 lg:hidden">
      <Tooltip delay={150}>
        <Button
          isIconOnly
          aria-expanded={overviewOpen}
          aria-label="Overview"
          className={cn(
            "border-border shrink-0",
            overviewOpen &&
              "border-accent bg-accent/15 text-accent ring-accent/25 ring-2",
          )}
          variant="outline"
          onPress={onOverviewPress}
        >
          <BookOpenIcon className="size-5 shrink-0" aria-hidden />
        </Button>
        <Tooltip.Content className={wikiRailTooltipClass} placement="bottom">
          Overview
        </Tooltip.Content>
      </Tooltip>
      <Tooltip delay={150}>
        <Button
          isIconOnly
          aria-expanded={outlineOpen}
          aria-label="On this page"
          className={cn(
            "border-border shrink-0",
            outlineOpen &&
              "border-accent bg-accent/15 text-accent ring-accent/25 ring-2",
          )}
          variant="outline"
          onPress={onOutlinePress}
        >
          <ListBulletIcon className="size-5 shrink-0" aria-hidden />
        </Button>
        <Tooltip.Content className={wikiRailTooltipClass} placement="bottom">
          On this page
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function OnThisPageOutlinePanel({
  toc,
  activeHeadingId,
  onNavigate,
}: {
  toc: WikiTocEntry[];
  activeHeadingId: string | null;
  onNavigate?: () => void;
}): ReactElement {
  return (
    <div className="rounded-lg border border-border/60 bg-surface/40 px-2 py-2">
      <WikiOnPageOutline
        entries={toc}
        activeId={activeHeadingId}
        onNavigate={onNavigate}
      />
    </div>
  );
}

/**
 * Wraps wiki routes with breadcrumbs, docked sticky Overview / On-this-page rails on large
 * screens (drawers + compact triggers on narrow viewports), live heading outline scans,
 * and scroll-spy highlighting for in-page links.
 *
 * @param props.children - Page content placed inside `[data-wiki-main]` for scanning.
 */
export function WikiDocShell({ children }: WikiDocShellProps): ReactElement {
  const pathname = usePathname() ?? "";
  const mainRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<WikiTocEntry[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [tocDrawerOpen, setTocDrawerOpen] = useState(false);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [overviewExpandedKeys, setOverviewExpandedKeys] = useState<
    Set<string>
  >(() => new Set());
  const [hashId, setHashId] = useState("");
  const [isLgViewport, setIsLgViewport] = useState(false);

  const current = useMemo(() => wikiDocTopicForPathname(pathname), [pathname]);

  const rescanToc = useCallback(() => {
    const root = mainRef.current?.querySelector("[data-wiki-main]");
    setToc(outlineFromMain(root instanceof HTMLElement ? root : null));
  }, []);

  useEffect(() => {
    const storedLeft = window.localStorage.getItem(STORAGE_LEFT);
    const storedRight = window.localStorage.getItem(STORAGE_RIGHT);
    if (storedLeft === "0") {
      setShowLeft(false);
    }
    if (storedRight === "0") {
      setShowRight(false);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_LEFT, showLeft ? "1" : "0");
  }, [hydrated, showLeft]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(STORAGE_RIGHT, showRight ? "1" : "0");
  }, [hydrated, showRight]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const syncViewport = (): void => {
      setIsLgViewport(mq.matches);
    };
    syncViewport();
    mq.addEventListener("change", syncViewport);
    return () => mq.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const topic = wikiDocTopics.find((t) => t.href === pathname);
    if (!topic) {
      return;
    }
    setOverviewExpandedKeys((prev) => new Set([...prev, topic.href]));
  }, [pathname]);

  useEffect(() => {
    const syncHashFromLocation = (): void => {
      const id =
        typeof window !== "undefined" ? window.location.hash.slice(1) : "";
      setHashId(id);
      if (id.length > 0 && toc.some((e) => e.id === id)) {
        setActiveHeadingId(id);
      }
    };
    syncHashFromLocation();
    window.addEventListener("hashchange", syncHashFromLocation);
    return () => window.removeEventListener("hashchange", syncHashFromLocation);
  }, [pathname, toc]);

  useEffect(() => {
    const root = mainRef.current?.querySelector("[data-wiki-main]");
    if (!(root instanceof HTMLElement)) {
      setToc([]);
      return;
    }

    rescanToc();
    const observer = new MutationObserver(() => {
      rescanToc();
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["id"],
    });

    return () => observer.disconnect();
  }, [pathname, rescanToc]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    if (hash && toc.some((e) => e.id === hash)) {
      setActiveHeadingId(hash);
      return;
    }
    if (toc[0]?.id) {
      setActiveHeadingId(toc[0].id);
    } else {
      setActiveHeadingId(null);
    }
  }, [pathname, toc]);

  useEffect(() => {
    if (toc.length === 0 || !isLgViewport) {
      return;
    }

    const elements = toc
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length === 0) {
          return;
        }
        intersecting.sort(
          (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
        );
        const id = intersecting[0]?.target.id;
        if (id) {
          setActiveHeadingId(id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 1],
      },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [toc, isLgViewport]);

  const overviewAccordionProps = {
    pathname,
    hashId,
    expandedKeys: overviewExpandedKeys,
    onExpandedChange: setOverviewExpandedKeys,
  };

  const handleOverviewToggle = (): void => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setShowLeft((v) => !v);
    } else {
      setNavDrawerOpen((o) => !o);
    }
  };

  const handleOutlineToggle = (): void => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setShowRight((v) => !v);
    } else {
      setTocDrawerOpen((o) => !o);
    }
  };

  return (
    <div className="wiki-doc-shell text-foreground w-full min-w-0">
      <div className="border-border mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between lg:mb-6">
        <Breadcrumbs className="text-sm font-medium min-w-0">
          <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
          <Breadcrumbs.Item href="/wiki/home">Wiki</Breadcrumbs.Item>
          <Breadcrumbs.Item>
            {current?.breadcrumbLabel ?? "Wiki"}
          </Breadcrumbs.Item>
        </Breadcrumbs>
        <WikiMobileRailTriggers
          outlineOpen={tocDrawerOpen}
          overviewOpen={navDrawerOpen}
          onOutlinePress={handleOutlineToggle}
          onOverviewPress={handleOverviewToggle}
        />
      </div>

      <Drawer.Backdrop isOpen={navDrawerOpen} onOpenChange={setNavDrawerOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog
            className="border-border bg-background flex max-w-[min(100vw-2rem,22rem)] flex-col border-r"
            style={{
              marginTop: WIKI_DOCS_TOP_OFFSET,
              height: WIKI_DOCS_PANEL_HEIGHT,
            }}
          >
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="text-base">Overview</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <WikiOverviewAccordion
                {...overviewAccordionProps}
                onNavigate={() => setNavDrawerOpen(false)}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <Drawer.Backdrop isOpen={tocDrawerOpen} onOpenChange={setTocDrawerOpen}>
        <Drawer.Content placement="right">
          <Drawer.Dialog
            className="border-border bg-background flex max-w-[min(100vw-2rem,22rem)] flex-col border-l"
            style={{
              marginTop: WIKI_DOCS_TOP_OFFSET,
              height: WIKI_DOCS_PANEL_HEIGHT,
            }}
          >
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="text-base">On this page</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <OnThisPageAccordion
                toc={toc}
                activeHeadingId={activeHeadingId}
                onNavigate={() => setTocDrawerOpen(false)}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

      <div className="flex w-full flex-col gap-0 lg:flex-row lg:items-start lg:gap-3">
        <WikiRailDock
          icon={<BookOpenIcon className="size-5 shrink-0" aria-hidden />}
          label="Overview"
          panelOpen={showLeft}
          panelWidthClass="w-[min(290px,28vw)]"
          side="left"
          onTogglePress={handleOverviewToggle}
        >
          <WikiOverviewAccordion {...overviewAccordionProps} />
        </WikiRailDock>

        <div ref={mainRef} className="min-w-0 flex-1 lg:px-8">
          <div
            data-wiki-main
            className="wiki-doc-main [&_h2[id]]:scroll-mt-28 [&_h3[id]]:scroll-mt-28 max-w-none"
          >
            {children}
          </div>
        </div>

        <WikiRailDock
          icon={<ListBulletIcon className="size-5 shrink-0" aria-hidden />}
          label="On this page"
          panelOpen={showRight}
          panelWidthClass="w-[min(270px,26vw)]"
          side="right"
          onTogglePress={handleOutlineToggle}
        >
          <OnThisPageOutlinePanel toc={toc} activeHeadingId={activeHeadingId} />
        </WikiRailDock>
      </div>
    </div>
  );
}
