"use client";

import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { THEME_STORAGE_KEY } from "./constants";

/**
 * ThemeProviderWrapper - Manages theme state and synchronization for HeroUI theming system.
 *
 * This component wraps the next-themes ThemeProvider and adds ThemeSync to ensure
 * HeroUI components receive the correct theme classes. HeroUI requires 'light' or 'dark'
 * classes on the root element (document.documentElement) to properly apply theme styles.
 *
 * The theming system works as follows:
 * 1. next-themes manages theme state and persistence (localStorage)
 * 2. ThemeSync adds/removes 'light'/'dark' classes on the root element
 * 3. HeroUI components use these classes via Tailwind's dark mode variant
 * 4. Components use HeroUI semantic tokens (bg-background, text-foreground, etc.)
 *
 * @see https://www.heroui.com/docs/customization/dark-mode
 * @see https://www.heroui.com/docs/customization/theme
 */

/**
 * Syncs theme class and data attributes for HeroUI compatibility.
 * HeroUI requires 'light' or 'dark' classes on the root element.
 */
function ThemeSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);

    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    root.dataset.colorMode = resolvedTheme === "dark" ? "oled" : "light";
  }, [resolvedTheme]);

  return null;
}

export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <ThemeSync />
      {children}
    </ThemeProvider>
  );
}
