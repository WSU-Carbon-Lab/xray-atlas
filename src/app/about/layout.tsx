import { SidebarNav } from "./_components/sidebar-nav";
import { aboutNavItems } from "~/lib/navigation";

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="sticky top-24">
            <SidebarNav items={aboutNavItems} />
          </div>
        </aside>
        <main className="lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}
