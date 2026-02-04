import "~/styles/globals.css";

import { Geist } from "next/font/google";
import Header from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { siteMetadata } from "./metadata";
import { SessionProvider } from "@/components/auth/session-provider";
import { ThemeProviderWrapper } from "@/components/theme/theme-provider";
import { TRPCReactProvider } from "@/trpc/client";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
/**
 * Root Layout - Main application layout with HeroUI theming integration.
 *
 * Theming Setup:
 * - ThemeProviderWrapper manages theme state and applies 'light'/'dark' classes
 * - body uses HeroUI semantic tokens (bg-background, text-foreground)
 * - suppressHydrationWarning prevents hydration mismatches during theme initialization
 *
 * HeroUI Token Usage:
 * - bg-background: Adapts to light/dark theme automatically
 * - text-foreground: Text color that adapts to theme
 *
 * @see ThemeProviderWrapper for theme management details
 */
export const metadata = {
  ...siteMetadata,
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} min-h-screen w-full`}
    >
      <body className="bg-background text-foreground flex min-h-screen flex-col">
        <SessionProvider>
          <TRPCReactProvider>
            <ThemeProviderWrapper>
              <Header />
              <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4">
                {children}
              </main>
              {modal}
              <SpeedInsights />
              <Analytics />
              <Footer />
            </ThemeProviderWrapper>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
