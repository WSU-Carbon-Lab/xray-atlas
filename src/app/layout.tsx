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
    <nav className="sticky top-0 z-50 w-full border-b bg-gray-50 text-black">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="hover:text-wsu-crimson flex items-center space-x-3 font-sans font-thin text-3xl text-black transition-colors hover:underline"
        >
          <Image
            src="/wsu-logo.png"
            alt="WSU Logo"
            width={40}
            height={40}
            className="hover-image-link bg-wsu-crimson h-10 w-auto rounded-lg"
          />
          <span>X-ray Atlas</span>
        </Link>

        <div className="text-large flex items-center gap-6 font-medium">
          <Link
            href="/"
            className="hover:text-wsu-crimson text-black transition-colors hover:underline"
          >
            Home
          </Link>
          <Link
            href="https://github.com/WSU-Carbon-Lab/xray-atlas"
            className="transition-all hover:scale-105"
          >
            <Image
              src={github}
              alt="GitHub"
              width={40}
              height={40}
              className="hover-image-link brightness-100"
            />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <h3 className="font-sans text-lg text-black">Xray Atlas</h3>
            <p className="flex-wrap text-sm text-gray-600">
              Advancing material research through collaborative data.
            </p>
            <h4 className="text-sm font-semibold text-gray-900">Hosted By</h4>
            <p className="text-sm text-gray-600">
              <Link
                href="https://labs.wsu.edu/carbon/"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Washington State University · Collins Research Group
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link
                href="https://faculty.psau.edu.sa/en/psau/facultymember/om.alqahtani"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Prince Sattam bin Abdulaziz University · Obaid Alqahtani
              </Link>
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new?template=upload-data.md"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Submit Data
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/releases/tag/0.1.0"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">
              Collaborators
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link
                  href="https://www.nist.gov/mml/materials-science-and-engineering-division/polymers-processing-group"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
                >
                  NIST RSoXR Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.bnl.gov/nsls2/beamlines/beamline.php?r=12-ID"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
                >
                  NSLS II SMI & SST1 Beamlines
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.ansto.gov.au/facilities/australian-synchrotron/synchrotron-beamlines/soft-x-ray-spectroscopy#content-scientists"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
                >
                  The Australian Synchrotron Soft X-ray Spectroscopy Beamline
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.monash.edu/engineering/chrismcneill"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
                >
                  Monash University Chris McNeill Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://weiyougroup.org/"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
                >
                  The University of North Carolina at Chapel Hill You Group
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between border-t pt-4 md:flex-row">
          <div className="text-center text-sm text-gray-600 md:text-left">
            © {new Date().getFullYear()} X-ray Atlas. All rights reserved.
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm md:mt-0 md:justify-end">
            <Link
              href="/privacy"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
            >
              WSU
            </Link>
          </div>
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
      <body className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex-1 bg-white">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
