import "~/styles/globals.css";

import { type Metadata } from "next";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Xray Atlas",
  description:
    "Database for Xray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],
};

function TopNav() {
  return (
    <nav className="flex w-full justify-between font-sans">
      <div className="flex w-full items-center font-sans">
        <Link href="/" className="p-5 pl-10 font-sans text-3xl">
          Xray Atlas
        </Link>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <section className="...">
          <TopNav />
        </section>
        {children}
        <div id="modal-root"></div>
      </body>
    </html>
  );
}
