"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@heroui/styles";
import { THEMES, type Theme } from "./constants";
import { headerMenuCanHover } from "../layout/header-menu-coordinator";
import {
  headerDropdownBridgeClass,
  headerDropdownInnerClass,
  headerDropdownPanelClass,
  useHeaderDropdown,
  useHeaderMenuInlineEdge,
} from "../layout/header-dropdown-menu";

const THEME_OPTIONS = [
  { id: THEMES.light, label: "Light", Icon: Sun },
  { id: THEMES.dark, label: "Dark", Icon: Moon },
  { id: THEMES.system, label: "System", Icon: Monitor },
] as const;

const THEME_MENU_ID = "theme";

function isThemeChoice(value: string | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Header theme button. The icon shows the stored choice, which defaults to system.
 *
 * The menu uses the same header panel as Browse and Learn, anchored to the full
 * header row so its top edge lines up with those menus. The panel is centered
 * under the icon. Hovering a fine pointer opens Light, Dark, and System.
 * Touch toggles the menu on click. System stores `system` and lets `next-themes`
 * follow the operating system.
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const selected: Theme = isThemeChoice(theme) ? theme : THEMES.system;
  const SelectedIcon =
    THEME_OPTIONS.find((option) => option.id === selected)?.Icon ?? Monitor;
  const { isOpen, dropdownRef, close, rootProps, triggerProps } =
    useHeaderDropdown(THEME_MENU_ID);
  const { panelRef, edgeClassName, edgeStyle } = useHeaderMenuInlineEdge(
    isOpen,
    dropdownRef,
  );

  return (
    <div
      ref={dropdownRef}
      className="relative flex h-full items-center"
      {...rootProps}
    >
      <button
        type="button"
        aria-label={`Color theme, ${selected}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        {...triggerProps}
        className="text-muted hover:text-foreground focus-visible:ring-accent flex size-8 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2"
      >
        <SelectedIcon className="size-4" aria-hidden />
      </button>
      {isOpen ? (
        <div
          ref={panelRef}
          className={cn(headerDropdownBridgeClass, edgeClassName)}
          style={edgeStyle}
        >
          <div
            role="menu"
            aria-label="Color theme"
            className={headerDropdownPanelClass}
          >
            <p className="text-muted px-1 text-xs">Theme</p>
            <div className={headerDropdownInnerClass}>
              {THEME_OPTIONS.map(({ id, label, Icon }) => {
                const isSelected = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setTheme(id);
                      if (!headerMenuCanHover()) {
                        close();
                      }
                    }}
                    className={cn(
                      "text-foreground decoration-foreground flex w-full items-center gap-2 px-1 py-1 text-left text-sm leading-snug underline-offset-4",
                      isSelected ? "underline" : "no-underline hover:underline",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
