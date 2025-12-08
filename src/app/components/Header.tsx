"use client";

import Link from "next/link";
import { Home, Info, Upload, Search } from "lucide-react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";
import { WSULogoIcon } from "./icons";
import { GitHubStarsLink } from "./GitHubStarsLink";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import CustomUserButton from "./CustomUserButton";
import { SignInButton } from "./SignInButton";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  return (
    <Navbar
      isBordered
      className="border-default bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur"
      classNames={{
        base: "h-20",
        wrapper: "w-full px-4",
      }}
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
          <Link
            href="/contribute"
            className="text-foreground hover:text-foreground flex items-center text-sm"
          >
            <Upload className="mr-2 h-4 w-4" />
            Contribute
          </Link>
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
          <SignedOut>
            <SignInButton variant="bordered" size="sm">
              Sign In
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <CustomUserButton
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
