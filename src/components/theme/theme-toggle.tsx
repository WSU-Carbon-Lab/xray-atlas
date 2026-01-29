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
 * HeroUI Token Usage:
 * - Uses text-foreground for icon color (adapts to theme)
 * - Uses bg-default-100 for hover state (adapts to theme)
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

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-default-100"
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
      className="flex items-center justify-center rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-default-100"
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
