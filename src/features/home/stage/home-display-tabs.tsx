"use client";

import type { ReactElement } from "react";

export interface HomeDisplayTab<T extends string> {
  id: T;
  label: string;
  /**
   * Visual group name. Adjacent tabs that share it sit together, after a
   * divider, with this name as the group's accessible label.
   */
  group?: string;
}

export interface HomeDisplayTabsProps<T extends string> {
  /** Accessible name for the tab list. */
  label: string;
  tabs: readonly HomeDisplayTab<T>[];
  /** Selected tab id. */
  value: T;
  onChange: (id: T) => void;
  /** Prefix for each tab's DOM id, `home-data` yields `home-data-spectra`. */
  idPrefix: string;
  /** Id of the panel these tabs control. */
  controls: string;
}

/**
 * Underline tab list shared by the home feature previews.
 *
 * `tabs` stay on one row and scroll sideways when the labels exceed the
 * preview width, so the row height does not change between features. Tabs
 * that share `group` are drawn as one cluster after a divider.
 */
export function HomeDisplayTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  idPrefix,
  controls,
}: HomeDisplayTabsProps<T>): ReactElement {
  const clusters: { group?: string; tabs: HomeDisplayTab<T>[] }[] = [];
  for (const tab of tabs) {
    const last = clusters[clusters.length - 1];
    if (last && last.group === tab.group) last.tabs.push(tab);
    else clusters.push({ group: tab.group, tabs: [tab] });
  }
  return (
    <div
      role="tablist"
      aria-label={label}
      className="border-border flex h-9 max-w-full min-w-0 shrink-0 items-end gap-6 overflow-x-auto border-b"
    >
      {clusters.map((cluster) => {
        const buttons = cluster.tabs.map((tab) => {
          const selected = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${idPrefix}-${tab.id}`}
              aria-selected={selected}
              aria-controls={controls}
              onClick={() => onChange(tab.id)}
              className={
                selected
                  ? "border-accent text-foreground -mb-px border-b-2 pb-2 text-sm font-medium whitespace-nowrap"
                  : "text-muted hover:text-foreground -mb-px border-b-2 border-transparent pb-2 text-sm whitespace-nowrap"
              }
            >
              {tab.label}
            </button>
          );
        });
        if (!cluster.group) {
          return (
            <div
              key={cluster.tabs.map((tab) => tab.id).join("-")}
              className="flex h-full shrink-0 items-end gap-6"
            >
              {buttons}
            </div>
          );
        }
        return (
          <div
            key={cluster.group}
            role="group"
            aria-label={cluster.group}
            className="border-border flex h-full shrink-0 items-end gap-4 border-l pl-6"
          >
            {buttons}
          </div>
        );
      })}
    </div>
  );
}
