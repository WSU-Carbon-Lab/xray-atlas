"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Info, Upload, Search, ChevronDown } from "lucide-react";
import { WSULogoIcon } from "../icons";
import { GitHubStarsLink } from "./github-stars-link";
import { useSession } from "next-auth/react";
import { CustomUserButton } from "@/components/ui/avatar";
import { SignInButton } from "../auth/sign-in-button";
import { ThemeToggle } from "../theme/theme-toggle";
import {
  BoltIcon,
  BeakerIcon,
  BookOpenIcon,
  BuildingOfficeIcon,
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
  HeaderMenuNestedGroup,
  HeaderMenuNestedLink,
  headerDropdownInnerClass,
  headerDropdownPanelClass,
  useHeaderDropdown,
} from "./header-dropdown-menu";

function AboutDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [wikiGroupExpanded, setWikiGroupExpanded] = useState<Set<string>>(
    () => new Set(),
  );
  const router = useRouter();

  const closeAll = (): void => {
    close();
    setIsWikiOpen(false);
    setWikiGroupExpanded(new Set());
  };

  const handleItemClick = (path: string): void => {
    router.push(path);
    closeAll();
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
          className={`${headerDropdownPanelClass} left-0 w-[min(100vw-2rem,18rem)]`}
        >
          <div className={headerDropdownInnerClass}>
            <HeaderMenuButton
              icon={InformationCircleIcon}
              label="About"
              onClick={() => handleItemClick("/about")}
            />
            <HeaderMenuButton
              icon={MapIcon}
              label="Roadmap"
              onClick={() => handleItemClick("/about/roadmap")}
            />
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
                      <HeaderMenuNestedLink
                        key={topic.href}
                        label={topic.label}
                        onClick={() => handleItemClick(topic.href)}
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
                      <HeaderMenuNestedLink
                        indent={2}
                        label={wikiTopicIntroLinkLabel(topic)}
                        onClick={() => handleItemClick(topic.href)}
                      />
                      {topic.sections.map((section) =>
                        section.href ? (
                          <HeaderMenuNestedLink
                            key={section.href}
                            indent={2}
                            label={section.label}
                            onClick={() => handleItemClick(section.href!)}
                          />
                        ) : null,
                      )}
                    </HeaderMenuNestedGroup>
                  );
                })}
              </div>
            ) : null}
            <HeaderMenuButton
              icon={NewspaperIcon}
              label="Blog"
              onClick={() => handleItemClick("/blog")}
            />
            <HeaderMenuButton
              icon={ShieldCheckIcon}
              label="Privacy"
              onClick={() => handleItemClick("/privacy")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrowseDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();
  const router = useRouter();

  const handleItemClick = (path: string): void => {
    router.push(path);
    close();
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
            <HeaderMenuButton
              icon={BoltIcon}
              label="NEXAFS"
              onClick={() => handleItemClick("/browse/nexafs")}
            />
            <HeaderMenuButton
              icon={BeakerIcon}
              label="Molecule"
              onClick={() => handleItemClick("/browse/molecules")}
            />
            <HeaderMenuButton
              icon={BuildingOfficeIcon}
              label="Facility"
              onClick={() => handleItemClick("/browse/facilities")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContributeDropdown() {
  const { isOpen, setIsOpen, dropdownRef, close } = useHeaderDropdown();
  const router = useRouter();

  const handleItemClick = (path: string): void => {
    router.push(path);
    close();
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
            <HeaderMenuButton
              icon={BoltIcon}
              label="NEXAFS"
              onClick={() => handleItemClick("/contribute/nexafs")}
            />
            <HeaderMenuButton
              icon={BeakerIcon}
              label="Molecule"
              onClick={() => handleItemClick("/contribute/molecule")}
            />
            <HeaderMenuButton
              icon={BuildingOfficeIcon}
              label="Facility"
              onClick={() => handleItemClick("/contribute/facility")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Header({
  whatsNew = null,
}: {
  whatsNew?: WhatsNewSummary | null;
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
              <GitHubStarsLink />
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
