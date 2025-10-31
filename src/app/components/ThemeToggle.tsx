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

  return (
    <Button
      aria-label={mounted ? `Switch to ${otherTheme} theme` : "Toggle theme"}
      onPress={() => setTheme(otherTheme)}
    >
      <SunIcon className="h-4 w-4 fill-zinc-900 dark:hidden" />
      <MoonIcon className="hidden h-4 w-4 fill-white dark:block" />
    </Button>
  );
}
