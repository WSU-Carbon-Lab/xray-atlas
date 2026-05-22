"use client";

import { useState, useRef, useEffect } from "react";
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
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { site } from "~/app/brand";

function AboutDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWikiOpen, setIsWikiOpen] = useState(false);
  const [isPlatformFeaturesOpen, setIsPlatformFeaturesOpen] = useState(false);
  const [isDataRepresentationOpen, setIsDataRepresentationOpen] = useState(false);
  const [isApiOpen, setIsApiOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsWikiOpen(false);
        setIsPlatformFeaturesOpen(false);
        setIsDataRepresentationOpen(false);
        setIsApiOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setIsWikiOpen(false);
    setIsPlatformFeaturesOpen(false);
    setIsDataRepresentationOpen(false);
    setIsApiOpen(false);
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
        <div className="border-border bg-surface absolute top-full left-0 z-50 mt-2 w-60 rounded-lg border shadow-lg">
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleItemClick("/about")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <InformationCircleIcon className="text-accent h-4 w-4" />
              <span>About</span>
            </button>
            <div className="border-border mx-2 my-1 rounded-md border bg-default/30 py-1">
              <button
                type="button"
                onClick={() => setIsWikiOpen((prev) => !prev)}
                className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors"
                aria-expanded={isWikiOpen}
                aria-controls="about-wiki-accordion"
              >
                <BookOpenIcon className="text-accent h-4 w-4" />
                <span>Wiki</span>
                <ChevronDown
                  className={`ml-auto h-3.5 w-3.5 transition-transform ${
                    isWikiOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isWikiOpen ? (
                <div id="about-wiki-accordion" className="mt-1 space-y-0.5 pb-1">
                  <button
                    type="button"
                    onClick={() => handleItemClick("/wiki/home")}
                    className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                  >
                    <BookOpenIcon className="text-accent h-4 w-4" />
                    <span>Wiki home</span>
                  </button>
                  <div className="mx-3 mt-1 mb-1 rounded border border-border bg-default/40">
                    <button
                      type="button"
                      onClick={() => setIsDataRepresentationOpen((prev) => !prev)}
                      className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors"
                      aria-expanded={isDataRepresentationOpen}
                      aria-controls="about-data-representation-accordion"
                    >
                      <BookOpenIcon className="text-accent h-4 w-4" />
                      <span>Data representation</span>
                      <ChevronDown
                        className={`ml-auto h-3.5 w-3.5 transition-transform ${
                          isDataRepresentationOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isDataRepresentationOpen ? (
                      <div
                        id="about-data-representation-accordion"
                        className="space-y-0.5 pb-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleItemClick("/wiki/data-representation")
                          }
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleItemClick(
                              "/wiki/data-representation/input-spectroscopy",
                            )
                          }
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Input spectroscopy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleItemClick(
                              "/wiki/data-representation/optical-constants",
                            )
                          }
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Optical constants & plot views</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mx-3 mt-1 mb-1 rounded border border-border bg-default/40">
                    <button
                      type="button"
                      onClick={() => setIsPlatformFeaturesOpen((prev) => !prev)}
                      className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors"
                      aria-expanded={isPlatformFeaturesOpen}
                      aria-controls="about-platform-features-accordion"
                    >
                      <BookOpenIcon className="text-accent h-4 w-4" />
                      <span>Platform features</span>
                      <ChevronDown
                        className={`ml-auto h-3.5 w-3.5 transition-transform ${
                          isPlatformFeaturesOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isPlatformFeaturesOpen ? (
                      <div
                        id="about-platform-features-accordion"
                        className="space-y-0.5 pb-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleItemClick("/wiki/platform-features")
                          }
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleItemClick(
                              "/wiki/platform-features/dataset-quality-metrics",
                            )
                          }
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Dataset quality metrics</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleItemClick("/wiki/contributions")}
                    className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                  >
                    <BookOpenIcon className="text-accent h-4 w-4" />
                    <span>Contribution guide</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick("/wiki/data-insights")}
                    className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                  >
                    <BookOpenIcon className="text-accent h-4 w-4" />
                    <span>Data Insights</span>
                  </button>
                  <div className="mx-3 mt-1 mb-1 rounded border border-border bg-default/40">
                    <button
                      type="button"
                      onClick={() => setIsApiOpen((prev) => !prev)}
                      className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-medium transition-colors"
                      aria-expanded={isApiOpen}
                      aria-controls="about-api-accordion"
                    >
                      <BookOpenIcon className="text-accent h-4 w-4" />
                      <span>API</span>
                      <ChevronDown
                        className={`ml-auto h-3.5 w-3.5 transition-transform ${
                          isApiOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isApiOpen ? (
                      <div id="about-api-accordion" className="space-y-0.5 pb-1">
                        <button
                          type="button"
                          onClick={() => handleItemClick("/wiki/api")}
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>Overview</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemClick("/wiki/api/openapi")}
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>OpenAPI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemClick("/wiki/api/v1")}
                          className="text-foreground hover:bg-default flex w-full items-center gap-3 px-3 py-2 pl-9 text-left text-sm transition-colors"
                        >
                          <BookOpenIcon className="text-accent h-4 w-4" />
                          <span>v1</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => handleItemClick("/privacy")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <ShieldCheckIcon className="text-accent h-4 w-4" />
              <span>Privacy</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrowseDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (path: string) => {
    router.push(path);
    setIsOpen(false);
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
        <div className="border-border bg-surface absolute top-full left-0 z-50 mt-2 w-48 rounded-lg border shadow-lg">
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleItemClick("/browse/nexafs")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BoltIcon className="text-accent h-4 w-4" />
              <span>NEXAFS</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick("/browse/molecules")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BeakerIcon className="text-accent h-4 w-4" />
              <span>Molecule</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick("/browse/facilities")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BuildingOfficeIcon className="text-accent h-4 w-4" />
              <span>Facility</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContributeDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (path: string) => {
    router.push(path);
    setIsOpen(false);
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
        <div className="border-border bg-surface absolute top-full right-0 z-50 mt-2 w-48 rounded-lg border shadow-lg">
          <div className="py-1">
            <button
              type="button"
              onClick={() => handleItemClick("/contribute/nexafs")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BoltIcon className="text-accent h-4 w-4" />
              <span>NEXAFS</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick("/contribute/molecule")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BeakerIcon className="text-accent h-4 w-4" />
              <span>Molecule</span>
            </button>
            <button
              type="button"
              onClick={() => handleItemClick("/contribute/facility")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <BuildingOfficeIcon className="text-accent h-4 w-4" />
              <span>Facility</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Header() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSignedIn = !!session?.user;
  const isLoaded = status !== "loading";

  return (
    <div className="sticky top-0 z-[400] w-full">
      <header className="border-border bg-background/95 w-full border-b backdrop-blur supports-backdrop-filter:bg-background/60">
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
                  <CustomUserButton />
                ) : (
                  <SignInButton size="sm">Sign In</SignInButton>
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
