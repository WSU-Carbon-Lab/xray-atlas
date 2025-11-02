import "~/styles/globals.css";

import { Geist } from "next/font/google";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { siteMetadata } from "./components/Metadata";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
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
        className={`${geist.variable} mx-auto flex min-h-screen w-6xl flex-col`}
      >
        <body>
          <Header />
          {children}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
