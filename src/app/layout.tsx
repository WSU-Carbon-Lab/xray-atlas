import "~/styles/globals.css";

import { Geist } from "next/font/google";
import Header from "./components/Header";
import { Footer } from "./components/Footer";
import { siteMetadata } from "./components/Metadata";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProviderWrapper } from "./components/ThemeProviderWrapper";
import { TRPCReactProvider } from "~/trpc/client";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${geist.variable} mx-auto flex min-h-screen w-full max-w-7xl flex-col`}
      >
        <body className="bg-background text-foreground">
          <TRPCReactProvider>
            <ThemeProviderWrapper>
              <Header />
              {children}
              <Footer />
            </ThemeProviderWrapper>
          </TRPCReactProvider>
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
