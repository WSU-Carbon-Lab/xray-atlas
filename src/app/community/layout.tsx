import React from "react";
import Link from "next/link";

const AboutLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-56">
          <div className="sticky top-24">
            <h2 className="mb-4 text-xl font-semibold">About The Project</h2>
            <nav className="flex flex-col space-y-2">
              <Link
                href="/about"
                className="text-gray-700 hover:text-wsu-crimson hover:underline"
              >
                Overview
              </Link>
              {/* Add links to other about sub-pages here */}
            </nav>
          </div>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};

export default AboutLayout;
