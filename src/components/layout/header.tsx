"use client";

import {
  useEffect,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@heroui/styles";
import { Home, Info, Upload, Search, ChevronDown } from "lucide-react";
import { WSULogoIcon } from "../icons";
import { GitHubStarsLink } from "./github-stars-link";
import { useSession } from "next-auth/react";
import { CustomUserButton } from "~/components/ui/avatar";
import { SignInButton } from "../auth/sign-in-button";
import { ThemeToggle } from "../theme/theme-toggle";
import {
  BoltIcon,
  BeakerIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
  CodeBracketIcon,
  CommandLineIcon,
  InformationCircleIcon,
  MapIcon,
  NewspaperIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { site } from "~/app/brand";
import { wikiDocTopics, wikiTopicIntroLinkLabel } from "~/lib/wiki-doc-nav";
import type { WhatsNewSummary } from "~/lib/whats-new-summary";
import {
  HeaderMenuButton,
  HeaderMenuColumn,
  HeaderMenuNestedGroup,
  headerDropdownInnerClass,
  headerDropdownPanelClass,
  useHeaderDropdown,
} from "./header-dropdown-menu";

type HeaderMenuIcon = ComponentType<{ className?: string }>;

const headerMenuLinkClass =
  "text-foreground hover:bg-default/50 flex min-h-9 w-full min-w-0 items-start gap-2.5 rounded-md px-3 py-2 text-left text-sm no-underline transition-colors";

function HeaderMenuLink({
  href,
  icon: Icon,
  label,
  onNavigate,
}: {
  href: string;
  icon?: HeaderMenuIcon;
  label: ReactNode;
  onNavigate: () => void;
}): ReactElement {
  return (
    <Link href={href} onClick={onNavigate} className={headerMenuLinkClass}>
      {Icon ? (
        <Icon className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
      ) : null}
      <span className="min-w-0 flex-1 leading-snug">{label}</span>
    </Link>
  );
}

function HeaderMenuNestedNavLink({
  href,
  label,
  indent = 1,
  onNavigate,
}: {
  href: string;
  label: ReactNode;
  indent?: 1 | 2;
  onNavigate: () => void;
}): ReactElement {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "text-foreground hover:bg-default/50 grid min-h-9 w-full min-w-0 grid-cols-[minmax(0,1fr)_0.875rem] items-center gap-x-2 rounded-md py-2 text-left text-sm no-underline transition-colors",
        indent === 2 ? "pr-3 pl-9" : "pr-3 pl-6",
      )}
    >
      <span className="min-w-0 leading-snug">{label}</span>
      <span aria-hidden className="size-3.5 shrink-0" />
    </Link>
  );
}

function AboutDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [wikiGroupExpanded, setWikiGroupExpanded] = useState<Set<string>>(
    () => new Set(),
  );

  const closeAll = (): void => {
    close();
    setIsWikiOpen(false);
    setWikiGroupExpanded(new Set());
  };

  const toggleWikiGroup = (key: string): void => {
    setWikiGroupExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-foreground hover:text-foreground flex items-center text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Info className="mr-2 h-4 w-4" />
        About
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div
          className={`${headerDropdownPanelClass} left-1/2 w-[min(100vw-2rem,36rem)] -translate-x-1/2 p-2`}
        >
          <div className="grid grid-cols-3 gap-1">
            <HeaderMenuColumn title="Discover">
              <HeaderMenuLink
                href="/about"
                icon={InformationCircleIcon}
                label="About"
                onNavigate={closeAll}
              />
              <HeaderMenuLink
                href="/blog"
                icon={NewspaperIcon}
                label="Blog"
                onNavigate={closeAll}
              />
            </HeaderMenuColumn>

            <HeaderMenuColumn title="Docs">
              <HeaderMenuButton
                aria-controls="about-wiki-nav"
                aria-expanded={isWikiOpen}
                chevronOpen={isWikiOpen}
                icon={BookOpenIcon}
                label="Wiki"
                onClick={() => setIsWikiOpen((prev) => !prev)}
              />
              {isWikiOpen ? (
                <div
                  id="about-wiki-nav"
                  className="border-border/60 flex w-full min-w-0 flex-col gap-0.5 border-l pl-1.5"
                >
                  {wikiDocTopics.map((topic) => {
                    if (topic.sections.length === 0) {
                      return (
                        <HeaderMenuNestedNavLink
                          key={topic.href}
                          href={topic.href}
                          label={topic.label}
                          onNavigate={closeAll}
                        />
                      );
                    }

                    const groupOpen = wikiGroupExpanded.has(topic.href);
                    return (
                      <HeaderMenuNestedGroup
                        key={topic.href}
                        id={`about-wiki-${topic.href.replace(/\//g, "-")}`}
                        isOpen={groupOpen}
                        label={topic.label}
                        onToggle={() => toggleWikiGroup(topic.href)}
                      >
                        <HeaderMenuNestedNavLink
                          href={topic.href}
                          indent={2}
                          label={wikiTopicIntroLinkLabel(topic)}
                          onNavigate={closeAll}
                        />
                        {topic.sections.map((section) =>
                          section.href ? (
                            <HeaderMenuNestedNavLink
                              key={section.href}
                              href={section.href}
                              indent={2}
                              label={section.label}
                              onNavigate={closeAll}
                            />
                          ) : null,
                        )}
                      </HeaderMenuNestedGroup>
                    );
                  })}
                </div>
              ) : null}
              <HeaderMenuLink
                href="/wiki/api"
                icon={CodeBracketIcon}
                label="API"
                onNavigate={closeAll}
              />
            </HeaderMenuColumn>

            <HeaderMenuColumn title="Project">
              <HeaderMenuLink
                href="/about/roadmap"
                icon={MapIcon}
                label="Roadmap"
                onNavigate={closeAll}
              />
              <HeaderMenuLink
                href="/about/developers"
                icon={CommandLineIcon}
                label="Developers"
                onNavigate={closeAll}
              />
              <HeaderMenuLink
                href="/privacy"
                icon={ShieldCheckIcon}
                label="Privacy"
                onNavigate={closeAll}
              />
            </HeaderMenuColumn>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrowseDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-foreground hover:text-foreground flex items-center text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Search className="mr-2 h-4 w-4" />
        Browse
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className={`${headerDropdownPanelClass} left-0 w-48`}>
          <div className={headerDropdownInnerClass}>
            <HeaderMenuLink
              href="/browse/nexafs"
              icon={BoltIcon}
              label="NEXAFS"
              onNavigate={close}
            />
            <HeaderMenuLink
              href="/browse/molecules"
              icon={BeakerIcon}
              label="Molecule"
              onNavigate={close}
            />
            <HeaderMenuLink
              href="/browse/facilities"
              icon={BuildingOfficeIcon}
              label="Facility"
              onNavigate={close}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContributeDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-foreground hover:text-foreground flex items-center text-sm"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Upload className="mr-2 h-4 w-4" />
        Contribute
        <ChevronDown
          className={`ml-1 h-3 w-3 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className={`${headerDropdownPanelClass} right-0 w-48`}>
          <div className={headerDropdownInnerClass}>
            <HeaderMenuLink
              href="/contribute/nexafs"
              icon={BoltIcon}
              label="NEXAFS"
              onNavigate={close}
            />
            <HeaderMenuLink
              href="/contribute/molecule"
              icon={BeakerIcon}
              label="Molecule"
              onNavigate={close}
            />
            <HeaderMenuLink
              href="/contribute/facility"
              icon={BuildingOfficeIcon}
              label="Facility"
              onNavigate={close}
            />
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
    <div className="sticky top-0 z-[400] w-full">
      <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/60 w-full border-b backdrop-blur">
        <nav
          className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4"
          aria-label="Main"
        >
          <div className="flex min-w-0 flex-1 items-center justify-start">
            <Link
              href="/"
              className="text-foreground hover:text-foreground flex items-center justify-start space-x-2 no-underline"
            >
              <WSULogoIcon className="block h-10 w-10 justify-start align-middle" />
              <span className="align-middle font-sans text-3xl leading-none font-bold">
                {site.name}
              </span>
            </Link>
          </div>

          <ul className="m-0 ml-auto flex list-none flex-wrap items-center gap-2 p-0 md:gap-5">
            <li className="hidden sm:flex">
              <Link
                href="/"
                className="text-foreground hover:text-foreground flex items-center text-sm"
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </li>
            <li className="hidden sm:flex">
              <BrowseDropdown />
            </li>
            <li className="hidden sm:flex">
              <AboutDropdown />
            </li>
            <li className="hidden sm:flex">
              <ContributeDropdown />
            </li>
            <li className="flex items-center">
              <div
                className="bg-border mx-2 h-6 w-px"
                style={{ minWidth: "1px" }}
              />
            </li>
            <li className="flex">
              <ThemeToggle />
            </li>
            <li className="flex">
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
