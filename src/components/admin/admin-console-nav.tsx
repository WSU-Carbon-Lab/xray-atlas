"use client";

/**
 * Shared admin console section links (users vs catalog).
 */

import Link from "next/link";
import { cn } from "@heroui/styles";

export type AdminConsoleSection = "users" | "catalog";

/**
 * Renders in-console navigation between user administration and catalog takedown.
 *
 * @param active - Currently visible admin section.
 */
export function AdminConsoleNav({ active }: { active: AdminConsoleSection }) {
  return (
    <nav
      className="mb-6 flex flex-wrap gap-2"
      aria-label="Administration sections"
    >
      <AdminConsoleNavLink
        href="/admin/users"
        active={active === "users"}
        label="Users"
      />
      <AdminConsoleNavLink
        href="/admin/catalog"
        active={active === "catalog"}
        label="Catalog"
      />
    </nav>
  );
}

function AdminConsoleNavLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-accent/40 bg-accent/15 text-foreground"
          : "border-border bg-surface text-muted hover:bg-surface-secondary hover:text-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}
