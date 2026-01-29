"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Info, Upload, Search, ChevronDown } from "lucide-react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import { WSULogoIcon } from "../icons";
import { GitHubStarsLink } from "./github-stars-link";
import { useSession } from "next-auth/react";
import { CustomUserButton } from "~/app/components/CustomUserButton";
import { SignInButton } from "../auth/sign-in-button";
import { ThemeToggle } from "../theme/theme-toggle";
import { BoltIcon, BeakerIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

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

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="py-1">
            <button
              onClick={() => handleItemClick("/contribute/nexafs")}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors dark:text-gray-300"
            >
              <BoltIcon className="h-4 w-4 text-accent dark:text-accent-light" />
              <span>NEXAFS</span>
            </button>
            <button
              onClick={() => handleItemClick("/contribute/molecule")}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors dark:text-gray-300"
            >
              <BeakerIcon className="h-4 w-4 text-accent dark:text-accent-light" />
              <span>Molecule</span>
            </button>
            <button
              onClick={() => handleItemClick("/contribute/facility")}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors dark:text-gray-300"
            >
              <BuildingOfficeIcon className="h-4 w-4 text-accent dark:text-accent-light" />
              <span>Facility</span>
            </button>
          </div>
        </div>
      )}
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
    <div className="w-full px-4">
      <Navbar
        isBordered
        className="border-default bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur h-20"
      >
      <NavbarBrand className="items-center justify-start">
        <Link
          href="/"
          className="text-foreground hover:text-foreground flex items-center justify-start space-x-2 no-underline"
        >
          <WSULogoIcon className="block h-10 w-10 justify-start align-middle" />
          <span className="align-middle font-sans text-3xl leading-none font-bold">
            X-ray Atlas
          </span>
        </Link>
      </NavbarBrand>

      <NavbarContent
        justify="end"
        className="ml-auto items-center gap-2 md:gap-5"
      >
        {/* Primary nav packed near GitHub / Sign In */}
        <NavbarItem className="hidden sm:flex">
          <Link
            href="/"
            className="text-foreground hover:text-foreground flex items-center text-sm"
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <Link
            href="/about"
            className="text-foreground hover:text-foreground flex items-center text-sm"
          >
            <Info className="mr-2 h-4 w-4" />
            About
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <Link
            href="/browse"
            className="text-foreground hover:text-foreground flex items-center text-sm"
          >
            <Search className="mr-2 h-4 w-4" />
            Browse
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <ContributeDropdown />
        </NavbarItem>
        {/* Vertical divider between navigation and actions */}
        <NavbarItem className="flex items-center">
          <div
            className="mx-2 h-6 w-px bg-gray-500 dark:bg-gray-300"
            style={{ minWidth: "1px" }}
          />
        </NavbarItem>
        <NavbarItem className="flex">
          <ThemeToggle />
        </NavbarItem>
        <NavbarItem className="flex">
          <GitHubStarsLink />
        </NavbarItem>
        <NavbarItem className="flex items-center">
          {mounted && isLoaded ? (
            isSignedIn ? (
              <CustomUserButton />
            ) : (
              <SignInButton size="sm">
                Sign In
              </SignInButton>
            )
          ) : (
            <div className="h-10 w-10" />
          )}
        </NavbarItem>
      </NavbarContent>
      </Navbar>
    </div>
  );
}
