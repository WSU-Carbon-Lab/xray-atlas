"use client";

import { useEffect, useRef, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { THEME_STORAGE_KEY } from "./theme/constants";

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
 * 5. OLED detection enables true black backgrounds for OLED displays
 *
 * @see https://www.heroui.com/docs/customization/dark-mode
 * @see https://www.heroui.com/docs/customization/theme
 */

/**
 * Detects OLED displays using heuristics for battery-optimized dark mode.
 * Uses multiple detection methods: media queries, color gamut, device pixel ratio,
 * and user agent detection for known OLED devices.
 */
function useOLEDDetection(): boolean {
  const [isOLED, setIsOLED] = useState(false);
  const detectionRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (detectionRef.current) return;

    const detectOLED = (): boolean => {
      if (typeof window === "undefined" || !window.matchMedia) {
        return false;
      }

      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

      const hasHighContrast = window.matchMedia(
        "(prefers-contrast: high)"
      ).matches;

      const hasWideColorGamut =
        window.matchMedia("(color-gamut: p3)").matches ||
        window.matchMedia("(color-gamut: rec2020)").matches;

      const highDPR = window.devicePixelRatio >= 2.5;

      const knownOLEDDevices =
        /iphone (x|1[1-9]|2[0-9])/i.test(userAgent) ||
        /iphone 1[0-9]/i.test(userAgent) ||
        /samsung.*galaxy (s|note|z)/i.test(userAgent) ||
        /pixel [3-9]/i.test(userAgent) ||
        /oneplus [5-9]/i.test(userAgent);

      const oledScore =
        (hasHighContrast ? 1 : 0) +
        (hasWideColorGamut ? 1 : 0) +
        (highDPR && isMobile ? 1 : 0) +
        (knownOLEDDevices ? 2 : 0);

      return oledScore >= 2;
    };

    const detected = detectOLED();
    setIsOLED(detected);
    detectionRef.current = true;

    const handleMediaChange = () => {
      const newDetection = detectOLED();
      if (newDetection !== isOLED) {
        setIsOLED(newDetection);
      }
    };

    const contrastQuery = window.matchMedia("(prefers-contrast: high)");
    const colorGamutQuery = window.matchMedia("(color-gamut: p3)");

    if (contrastQuery.addEventListener) {
      contrastQuery.addEventListener("change", handleMediaChange);
    }
    if (colorGamutQuery.addEventListener) {
      colorGamutQuery.addEventListener("change", handleMediaChange);
    }

    return () => {
      if (contrastQuery.removeEventListener) {
        contrastQuery.removeEventListener("change", handleMediaChange);
      }
      if (colorGamutQuery.removeEventListener) {
        colorGamutQuery.removeEventListener("change", handleMediaChange);
      }
    };
  }, [isOLED]);

  return isOLED;
}

/**
 * Syncs theme class and data attributes for HeroUI compatibility.
 * HeroUI requires 'light' or 'dark' classes on the root element.
 * Also manages OLED class for true black backgrounds on OLED displays.
 */
function ThemeSync() {
  const { resolvedTheme } = useTheme();
  const isOLED = useOLEDDetection();

  useEffect(() => {
    if (!resolvedTheme) return;
    const root = document.documentElement;

    root.classList.remove("light", "dark", "oled");

    root.classList.add(resolvedTheme);

    if (resolvedTheme === "dark" && isOLED) {
      root.classList.add("oled");
    }

    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, isOLED]);

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
