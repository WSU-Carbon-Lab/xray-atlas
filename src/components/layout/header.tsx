"use client";

import {
  useEffect,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@heroui/styles";
import { ChevronDown, Upload } from "lucide-react";
import { WSULogoIcon } from "../icons";
import { GitHubStarsLink } from "./github-stars-link";
import { useSession } from "next-auth/react";
import { CustomUserButton } from "~/components/ui/avatar";
import { SignInButton } from "../auth/sign-in-button";
import { ThemeToggle } from "../theme/theme-toggle";
import { site } from "~/app/brand";
import type { WhatsNewSummary } from "~/lib/whats-new-summary";
import {
  headerDropdownBridgeClass,
  headerDropdownInnerClass,
  headerDropdownPanelClass,
  useHeaderDropdown,
  useHeaderMenuInlineEdge,
} from "./header-dropdown-menu";

const headerMenuLinkClass =
  "text-foreground decoration-foreground block px-1 py-1 text-sm leading-snug whitespace-nowrap no-underline underline-offset-4 transition-colors hover:underline";

/**
 * Header nav label. The word underlines while the menu is open or hovered.
 */
function HeaderNavTrigger({
  label,
  isOpen,
  triggerProps,
}: {
  label: string;
  isOpen: boolean;
  triggerProps: {
    onClick: () => void;
    onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>) => void;
  };
}): ReactElement {
  return (
    <button
      type="button"
      className="text-foreground flex items-center gap-1 text-sm"
      aria-expanded={isOpen}
      aria-haspopup="menu"
      {...triggerProps}
    >
      <span
        className={cn(
          "decoration-transparent underline underline-offset-[6px] transition-[text-decoration-color] duration-200",
          isOpen ? "decoration-foreground" : "hover:decoration-foreground",
        )}
      >
        {label}
      </span>
      <ChevronDown
        className={cn(
          "size-3 opacity-70 transition-transform duration-200 ease-out",
          isOpen && "rotate-180",
        )}
        aria-hidden
      />
    </button>
  );
}

function HeaderMenuLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: ReactNode;
  onNavigate: () => void;
}): ReactElement {
  return (
    <Link href={href} onClick={onNavigate} className={headerMenuLinkClass}>
      {label}
    </Link>
  );
}

const headerNavLinkClass =
  "text-foreground decoration-transparent text-sm underline underline-offset-[6px] transition-[text-decoration-color] duration-200 hover:decoration-foreground";

const BROWSE_ITEMS = [
  { href: "/browse/nexafs", label: "NEXAFS" },
  { href: "/browse/molecules", label: "Molecule" },
  { href: "/browse/facilities", label: "Facility" },
] as const;

const LEARN_ITEMS = [
  { href: "/wiki", label: "Wiki" },
  { href: "/docs", label: "Dev Docs" },
  { href: "/wiki/atlas", label: "Using X-ray Atlas" },
] as const;

const NEWS_ITEMS = [
  { href: "/blog", label: "Blog" },
  { href: "/about/roadmap", label: "Roadmap" },
  { href: "/about/developers", label: "Developers" },
] as const;

const CONTRIBUTE_ITEMS = [
  { href: "/wiki/atlas/contributing", label: "Get started" },
  { href: "/contribute", label: "Upload data" },
] as const;

/**
 * Header menu with a muted section label and text links.
 *
 * The panel is centered under the trigger. Nested wiki sections stay on
 * the wiki. The panel repeats `label` as the kicker.
 */
function HeaderNavMenu({
  menuId,
  label,
  items,
}: {
  menuId: string;
  label: string;
  items: readonly { href: string; label: string }[];
}): ReactElement {
  const { isOpen, dropdownRef, close, rootProps, triggerProps } =
    useHeaderDropdown(menuId);
  const { panelRef, edgeClassName, edgeStyle } = useHeaderMenuInlineEdge(
    isOpen,
    dropdownRef,
  );

  return (
    <div
      className="relative flex h-full items-center"
      ref={dropdownRef}
      {...rootProps}
    >
      <HeaderNavTrigger
        isOpen={isOpen}
        label={label}
        triggerProps={triggerProps}
      />
      {isOpen ? (
        <div
          ref={panelRef}
          className={cn(headerDropdownBridgeClass, edgeClassName)}
          style={edgeStyle}
        >
          <div className={headerDropdownPanelClass}>
            <p className="text-muted px-1 text-xs">{label}</p>
            <div className={headerDropdownInnerClass}>
              {items.map((item) => (
                <HeaderMenuLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  onNavigate={close}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Accent header action for starting or uploading.
 *
 * The control sits after a divider so it reads apart from the text nav. The
 * menu offers the contributing guide and the upload hub.
 */
function HeaderContributeMenu(): ReactElement {
  const { isOpen, dropdownRef, close, rootProps, triggerProps } =
    useHeaderDropdown("contribute");
  const { panelRef, edgeClassName, edgeStyle } = useHeaderMenuInlineEdge(
    isOpen,
    dropdownRef,
  );

  return (
    <div
      className="relative flex h-full items-center"
      ref={dropdownRef}
      {...rootProps}
    >
      <button
        type="button"
        className="bg-accent text-accent-foreground focus-visible:ring-accent inline-flex h-10 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium shadow-[0_8px_20px_-12px_var(--accent)] transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 lg:px-3.5"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Contribute"
        {...triggerProps}
      >
        <Upload className="size-4" aria-hidden />
        <span className="hidden lg:inline">Contribute</span>
        <ChevronDown
          className={cn(
            "hidden size-3 opacity-80 transition-transform duration-200 ease-out lg:block",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {isOpen ? (
        <div
          ref={panelRef}
          className={cn(headerDropdownBridgeClass, edgeClassName)}
          style={edgeStyle}
        >
          <div className={headerDropdownPanelClass}>
            <p className="text-muted px-1 text-xs">Contribute</p>
            <div className={headerDropdownInnerClass}>
              {CONTRIBUTE_ITEMS.map((item) => (
                <HeaderMenuLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  onNavigate={close}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Header({
  whatsNew = null,
  githubStars,
}: {
  whatsNew?: WhatsNewSummary | null;
  githubStars?: number | null;
}) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSignedIn = !!session?.user;
  const isLoaded = status !== "loading";

  return (
    <div data-site-header className="sticky top-0 z-[400] w-full">
      <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/60 w-full border-b backdrop-blur">
        <nav
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4"
          aria-label="Main"
        >
          <div className="flex shrink-0 items-center justify-start">
            <Link
              href="/"
              className="text-foreground hover:text-foreground flex min-w-0 items-center justify-start space-x-2 no-underline"
            >
              <WSULogoIcon className="block h-10 w-10 shrink-0 justify-start align-middle" />
              <span className="hidden align-middle font-sans text-3xl leading-none font-bold whitespace-nowrap sm:inline">
                {site.name}
              </span>
            </Link>
          </div>

          <ul className="m-0 ml-auto flex h-full min-w-0 list-none flex-nowrap items-center gap-x-2 p-0 md:gap-x-3 lg:gap-x-5">
            <li className="hidden h-full md:flex">
              <HeaderNavMenu
                menuId="browse"
                label="Browse"
                items={BROWSE_ITEMS}
              />
            </li>
            <li className="hidden h-full md:flex">
              <HeaderNavMenu menuId="learn" label="Learn" items={LEARN_ITEMS} />
            </li>
            <li className="hidden h-full md:flex">
              <HeaderNavMenu menuId="news" label="News" items={NEWS_ITEMS} />
            </li>
            <li className="hidden md:flex">
              <Link href="/about" className={headerNavLinkClass}>
                About
              </Link>
            </li>
            <li className="hidden md:flex">
              <Link href="/privacy" className={headerNavLinkClass}>
                Policy
              </Link>
            </li>
            <li aria-hidden className="bg-border hidden h-5 w-px md:block" />
            <li className="flex h-full items-center">
              <HeaderContributeMenu />
            </li>
            <li className="flex h-full items-center gap-0.5">
              <ThemeToggle />
              <GitHubStarsLink stars={githubStars} />
            </li>
            <li className="flex items-center">
              {mounted && isLoaded ? (
                isSignedIn ? (
                  <CustomUserButton whatsNew={whatsNew ?? undefined} />
                ) : (
                  <SignInButton>Sign In</SignInButton>
                )
              ) : (
                <div className="h-10 w-10" />
              )}
            </li>
          </ul>
        </nav>
      </header>
    </div>
  );
}
