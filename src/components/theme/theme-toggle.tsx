"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle - Button component for switching between light and dark themes.
 *
 * This component uses next-themes to manage theme state and integrates with HeroUI's
 * theming system. It handles hydration properly to prevent flash of incorrect theme
 * on initial page load.
 *
 * Usage:
 * - Place in navigation or header
 * - Automatically syncs with ThemeProviderWrapper
 * - Persists theme preference in localStorage
 *
 * Theme tokens: text-foreground, border-border, bg-surface, hover:bg-default, rounded-lg.
 *
 * @see ThemeProviderWrapper for theme management setup
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="border-border bg-surface flex h-10 w-10 items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-default"
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={handleToggle}
      className="border-border bg-surface flex h-10 w-10 items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-default focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      type="button"
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}
