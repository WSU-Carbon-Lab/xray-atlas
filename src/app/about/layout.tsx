import React from "react";
import { SidebarNav } from "./_components/sidebar-nav";

const sidebarNavItems = [
  {
    title: "Overview",
    href: "/about",
  },
  {
    title: "How-to Guide",
    href: "/about/how-to-guide",
  },
  {
    title: "Schema",
    href: "/about/schema",
  },
  {
    title: "Technology",
    href: "/about/technology",
  },
];

const AboutLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <SidebarNav items={sidebarNavItems} />
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AboutLayout;
