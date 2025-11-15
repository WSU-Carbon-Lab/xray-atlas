"use client";

import { useEffect } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { THEME_STORAGE_KEY } from "./theme/constants";

function ThemeSync() {
  let { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    let root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
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
