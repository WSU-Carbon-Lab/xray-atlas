"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/app/_components/ui/accordion";
import { cn } from "~/lib/utils";
import React from "react";
import * as Icons from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: keyof typeof Icons;
  subItems?: NavItem[];
}

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: NavItem[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  const renderLink = (item: NavItem) => {
    const Icon = Icons[item.icon] as React.ElementType;
    if (!Icon) {
      return null;
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          pathname === item.href ? "bg-accent" : "transparent",
        )}
      >
        <Icon className="mr-2 h-4 w-4" />
        {item.title}
      </Link>
    );
  };

  return (
    <nav className={cn("flex flex-col space-y-1", className)} {...props}>
      {items.map((item) => {
        const Icon = Icons[item.icon] as React.ElementType;
        if (!Icon) {
          return null;
        }
        return item.subItems ? (
          <Accordion key={item.href} type="single" collapsible>
            <AccordionItem value={item.href} className="border-b-0">
              <div className="flex items-center justify-between rounded-md pr-2 hover:bg-accent">
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-grow items-center rounded-md px-3 py-2 text-sm font-medium",
                    pathname.startsWith(item.href)
                      ? "text-accent-foreground"
                      : "hover:text-accent-foreground",
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.title}
                </Link>
                <AccordionTrigger
                  className={cn(
                    "p-1",
                    item.subItems.some((sub) => pathname.startsWith(sub.href))
                      ? "text-accent-foreground"
                      : "",
                  )}
                ></AccordionTrigger>
              </div>
              <AccordionContent className="pb-0">
                <div className="ml-4 mt-1 space-y-1 border-l pl-4">
                  {item.subItems.map(renderLink)}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          renderLink(item)
        );
      })}
    </nav>
  );
}
