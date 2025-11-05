"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { DefaultButton as Button } from "./Button";

export function ThemeToggle() {
  let { resolvedTheme, setTheme } = useTheme();
  let otherTheme = resolvedTheme === "dark" ? "light" : "dark";
  let [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button aria-label="Toggle theme">
        <SunIcon className="h-4 w-4 fill-zinc-900" />
      </Button>
    );
  }

  return (
    <Button
      aria-label={`Switch to ${otherTheme} theme`}
      onPress={() => setTheme(otherTheme)}
      className="cursor-pointer"
    >
      <SunIcon className="h-4 w-4 fill-zinc-900 dark:hidden" />
      <MoonIcon className="hidden h-4 w-4 fill-white dark:block" />
    </Button>
  );
}
