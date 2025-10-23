"use client";

import Link from "next/link";
import Image from "next/image";
import github from "public/github-mark.svg";
import { Home, Info, Upload } from "lucide-react";
import { Button } from "./ui";
// Temporarily commented out to resolve build issues
// import { useCurrentUser } from "~/lib/auth";

export function TopNav() {
  // Temporarily commented out to resolve build issues
  // const { user, userAttributes, signOut } = useCurrentUser();
  const user = false;
  const signOut = (): void => {
    // Placeholder function
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center space-x-3 font-sans text-3xl font-thin"
        >
          <Image
            src="/wsu-logo.png"
            alt="WSU Logo"
            width={40}
            height={40}
            className="h-10 w-auto rounded-lg bg-wsu-crimson"
          />
          <span>X-ray Atlas</span>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
            <Link
              href="/about"
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Info className="mr-2 h-4 w-4" />
              About
            </Link>
            <Link
              href="/upload"
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Link>
            {user && (
              <>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Profile
                </Link>
                <Link
                  href="/organizations"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Organizations
                </Link>
              </>
            )}
          </nav>

          <Link
            href="https://github.com/WSU-Carbon-Lab/xray-atlas"
            className="transition-all hover:scale-105"
          >
            <Image
              src={github}
              alt="GitHub"
              width={40}
              height={40}
              className="brightness-100"
            />
          </Link>

          {/* Authentication */}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">User</span>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/sign-in">Sign In with ORCID</a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
