import "~/styles/globals.css";
import { type Metadata } from "next";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import github from "public/github-mark.svg";

export const metadata: Metadata = {
  title: {
    template: "%s | Xray Atlas",
    default: "Xray Atlas",
  },
  description:
    "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],
};

function TopNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center space-x-2 text-2xl font-bold transition-transform hover:scale-105"
        >
          <span className="text bg-gradient-to-r from-blue-200 to-purple-500 bg-clip-text text-transparent">
            XRay Atlas
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-600 transition-colors hover:text-blue-600"
          >
            Home
          </Link>
          {/* <Link
            href="/browse"
            className="text-gray-600 transition-colors hover:text-blue-600"
          >
            Browse
          </Link>
          <Link
            href="/about"
            className="text-gray-600 transition-colors hover:text-blue-600"
          >
            About
          </Link> */}
          <Link href="https://github.com/WSU-Carbon-Lab/xray-atlas">
            <Image src={github} alt="download" width={30} height={30} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">XRay Atlas</h3>
            <p className="flex-wrap text-sm text-gray-600">
              Advancing material research tough colaborative data.
            </p>
            <h4 className="text-sm font-semibold text-gray-900">Hosted By</h4>
            <p className="text-sm text-gray-600">
              <Link href="https://labs.wsu.edu/carbon/">
                Washington State University
                <br />
                Collins Research Group
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new?template=upload-data.md"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Submit Data
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/releases/tag/0.1.0"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Collaborators
            </h4>
            <p className="text-sm text-gray-600">
              <Link href="https://www.nist.gov/mml/materials-science-and-engineering-division/polymers-processing-group">
                NIST Polymers Processing Group
              </Link>
              <br />
              <Link href="https://www.bnl.gov/nsls2/beamlines/beamline.php?r=12-ID">
                NSLS II
              </Link>
              <br />
              <Link href="https://www.ansto.gov.au/facilities/australian-synchrotron/synchrotron-beamlines/soft-x-ray-spectroscopy#content-scientists">
                The Australian Synchrotron
              </Link>
              <br />
              <Link href="https://www.monash.edu/engineering/chrismcneill">
                Monash University Chris McNeill Group
              </Link>
              <br />
              <Link href={"https://weiyougroup.org/"}>
                The University of North Carolina at Chapel Hill You Group
              </Link>
              <br />
            </p>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} XRay Atlas. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <TopNav />
        <main className="container z-0 px-4 py-8 sm:px-6 md:py-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {children}
          </div>
        </main>
        <Footer />
        <div id="modal-root" />
      </body>
    </html>
  );
}
