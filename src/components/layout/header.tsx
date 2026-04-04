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
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

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
                X-ray Atlas
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
              <Link
                href="/about"
                className="text-foreground hover:text-foreground flex items-center text-sm"
              >
                <Info className="mr-2 h-4 w-4" />
                About
              </Link>
            </li>
            <li className="hidden sm:flex">
              <Link
                href="/browse"
                className="text-foreground hover:text-foreground flex items-center text-sm"
              >
                <Search className="mr-2 h-4 w-4" />
                Browse
              </Link>
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
