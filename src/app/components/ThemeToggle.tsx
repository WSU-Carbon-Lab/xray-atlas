"use client";

import {
  ComputerDesktopIcon,
  MoonIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const baseButtonClasses =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50";
const primaryButtonClasses =
  baseButtonClasses +
  " border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700";
const secondaryButtonClasses =
  baseButtonClasses +
  " border-gray-200 bg-transparent text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

export function ThemeToggle() {
  let { theme, resolvedTheme, setTheme } = useTheme();
  let [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <button type="button" className={primaryButtonClasses} disabled>
          <SunIcon className="h-4 w-4 opacity-50" />
          <MoonIcon className="h-4 w-4 opacity-50" />
        </button>
      </div>
    );
  }

  let isSystem = theme === "system";
  let otherTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={!isSystem}
        aria-label={
          isSystem
            ? `Switch away from system theme to ${otherTheme}`
            : `Switch to ${otherTheme} theme`
        }
        className={primaryButtonClasses}
        onClick={() => setTheme(otherTheme)}
      >
        <SunIcon
          className={`h-4 w-4 fill-black transition-opacity dark:fill-white ${resolvedTheme === "dark" ? "opacity-30" : "opacity-100"}`}
        />
        <MoonIcon
          className={`h-4 w-4 fill-black transition-opacity dark:fill-white ${resolvedTheme === "dark" ? "opacity-100" : "opacity-30"}`}
        />
        {isSystem && (
          <span className="ml-1 rounded-full border border-gray-200 px-2 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">
            Auto
          </span>
        )}
      </button>
      {!isSystem && (
        <button
          type="button"
          aria-label="Return to system theme"
          className={secondaryButtonClasses}
          onClick={() => setTheme("system")}
        >
          <ComputerDesktopIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
