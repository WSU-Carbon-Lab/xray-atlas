"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ComponentPropsWithoutRef } from "react";
import { Tabs } from "@heroui/react";
import {
  BeakerIcon,
  BoltIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

type BrowseTabId = "molecules" | "nexafs" | "facilities";

function pathToSelectedKey(pathname: string | null): BrowseTabId {
  if (!pathname || pathname === "/browse") return "molecules";
  if (pathname.startsWith("/browse/nexafs")) return "nexafs";
  if (pathname.startsWith("/browse/facilities")) return "facilities";
  return "molecules";
}

const tabLinkClass =
  "relative flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:shadow-sm";

export function BrowseTabs() {
  const pathname = usePathname();
  const selectedKey = useMemo(() => pathToSelectedKey(pathname), [pathname]);

  return (
    <Tabs selectedKey={selectedKey} className="mb-8 w-full min-w-0">
      <Tabs.ListContainer className="w-full min-w-0">
        <Tabs.List
          aria-label="Browse sections"
          className="border-border bg-surface flex min-h-12 w-full min-w-0 flex-wrap gap-0.5 rounded-xl border p-1 *:flex *:min-h-10 *:flex-1 *:items-center *:justify-center *:gap-2 *:rounded-lg *:px-3 *:text-sm *:font-medium *:text-muted *:transition-colors *:[&_svg]:block sm:flex-nowrap sm:*:min-w-0"
        >
          <Tabs.Tab
            id="molecules"
            href="/browse/molecules"
            aria-label="Browse molecules"
            className={tabLinkClass}
            render={(domProps) => (
              <Link
                {...(domProps as ComponentPropsWithoutRef<typeof Link>)}
                href="/browse/molecules"
                scroll={false}
              />
            )}
          >
            <BeakerIcon className="h-5 w-5 shrink-0 stroke-[1.5]" aria-hidden />
            <span className="truncate">Molecules</span>
          </Tabs.Tab>
          <Tabs.Tab
            id="nexafs"
            href="/browse/nexafs"
            aria-label="Browse NEXAFS datasets"
            className={tabLinkClass}
            render={(domProps) => (
              <Link
                {...(domProps as ComponentPropsWithoutRef<typeof Link>)}
                href="/browse/nexafs"
                scroll={false}
              />
            )}
          >
            <BoltIcon className="h-5 w-5 shrink-0 stroke-[1.5]" aria-hidden />
            <span className="truncate">NEXAFS</span>
          </Tabs.Tab>
          <Tabs.Tab
            id="facilities"
            href="/browse/facilities"
            aria-label="Browse facilities"
            className={tabLinkClass}
            render={(domProps) => (
              <Link
                {...(domProps as ComponentPropsWithoutRef<typeof Link>)}
                href="/browse/facilities"
                scroll={false}
              />
            )}
          >
            <BuildingOfficeIcon
              className="h-5 w-5 shrink-0 stroke-[1.5]"
              aria-hidden
            />
            <span className="truncate">Facilities</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );
}
