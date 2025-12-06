import "~/styles/globals.css";

import { Geist } from "next/font/google";
import Header from "./components/Header";
import { Footer } from "./components/Footer";
import { siteMetadata } from "./components/Metadata";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProviderWrapper } from "./components/ThemeProviderWrapper";
import { TRPCReactProvider } from "~/trpc/client";
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
        <body className="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
          <TRPCReactProvider>
            <ThemeProviderWrapper>
              <Header />
              {children}
              <Footer />
            </ThemeProviderWrapper>
          </TRPCReactProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
