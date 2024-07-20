import "~/styles/globals.css";

import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Xray Atlas",
  description:
    "Database for Xray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],
};

function TopNav() {
  return (
    <header className="flex w-full justify-between border-b-2 border-gray-800">
      <div className="flex w-full items-center">
        <a href="/" className="p-5 pl-10 font-mono text-3xl font-thin">
          「 Xray Atlas 」
        </a>
      </div>
    </header>
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
      </body>
    </html>
  );
}
