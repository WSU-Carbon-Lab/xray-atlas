import type { ReactNode } from "react";

/**
 * Full-width dashboard shell for the unified plot viewer.
 */
export default function DashboardPlotLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="container mx-auto w-full max-w-[1600px] flex-1 px-4 py-8">
      {children}
    </div>
  );
}
