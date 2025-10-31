"use client";

import Link from "next/link";
import { Home, Info, Upload, Search } from "lucide-react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";
import { DefaultButton as Button } from "./Button";
import { WSULogoIcon } from "./icons";
import { GitHubStarsLink } from "./GitHubStarsLink";
import { ThemeToggle } from "./ThemeToggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <Navbar
      isBordered
      className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 backdrop-blur"
      classNames={{
        base: "h-20",
        wrapper: "w-full px-4",
      }}
    >
      <NavbarBrand className="items-center justify-start">
        <Link
          href="/"
          className="flex items-center justify-start space-x-2 text-gray-700 no-underline hover:text-gray-900"
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
            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <Link
            href="/about"
            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <Info className="mr-2 h-4 w-4" />
            About
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden sm:flex">
          <Link
            href="/upload"
            className="flex items-center text-sm text-gray-700 hover:text-gray-900"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Link>
        </NavbarItem>
        <NavbarItem className="flex">
          <div className="h-8 w-px bg-gray-300 py-2" />
        </NavbarItem>
        <NavbarItem className="flex">
          <GitHubStarsLink />
        </NavbarItem>
        {/* Vertical divider */}
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>
        <NavbarItem className="flex items-center">
          <SignedOut>
            <SignInButton>
              <Button variant="bordered" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  userButtonAvatarBox: "h-10 w-10",
                  userButtonRoot: "flex items-center",
                },
              }}
            />
          </SignedIn>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
