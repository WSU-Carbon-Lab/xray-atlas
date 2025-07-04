import "~/styles/globals.css";
import { type Metadata, type Viewport } from "next";
import Link from "next/link";
import React from "react";
import Image from "next/image";
import github from "public/github-mark.svg";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#C8102E", // WSU crimson
};

export const metadata: Metadata = {
  title: {
    template: "%s | Xray Atlas",
    default: "Xray Atlas",
  },
  description:
    "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
  icons: [{ rel: "icon", url: "https://repo.wsu.edu/favicon/icon.svg" }],

  // Open Graph metadata (for Facebook, LinkedIn, etc.)
  openGraph: {
    type: "website",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    siteName: "Xray Atlas",
    images: [
      {
        url: "https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattxrayering-Rendering.jpg", // Replace with your actual image URL
        width: 1200,
        height: 630,
        alt: "Xray Atlas Preview Image",
      },
    ],
  },

  // Twitter metadata
  twitter: {
    card: "summary_large_image",
    title: "Xray Atlas | WSU Collins Research Group",
    description:
      "Comprehensive database for X-ray spectroscopy data collected by the WSU Collins Lab",
    images: [
      "https://wpcdn.web.wsu.edu/wp-labs/uploads/sites/945/2017/11/Scattering-Rendering.jpg",
    ], // Replace with your actual image URL=
  },

  // Additional metadata
  applicationName: "Xray Atlas",
  keywords: [
    "X-ray spectroscopy",
    "NEXAFS",
    "material research",
    "WSU",
    "Collins Lab",
  ],
  authors: [
    { name: "WSU Collins Research Group", url: "https://labs.wsu.edu/carbon/" },
  ],
  robots: "index, follow",
  // viewport and themeColor properties have been moved to viewport export
};

function TopNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-gray-50 text-black">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center space-x-3 font-sans font-thin text-3xl text-black transition-colors hover:text-wsu-crimson hover:underline"
        >
          <Image
            src="/wsu-logo.png"
            alt="WSU Logo"
            width={40}
            height={40}
            className="hover-image-link h-10 w-auto rounded-lg bg-wsu-crimson"
          />
          <span>X-ray Atlas</span>
        </Link>

        <div className="text-large flex items-center gap-6 font-medium">
          <Link
            href="/"
            className="text-black transition-colors hover:text-wsu-crimson hover:underline"
          >
            Home
          </Link>
          <Link
            href="/upload"
            className="text-black transition-colors hover:text-wsu-crimson hover:underline"
          >
            Upload
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
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Washington State University · Collins Research Group
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              <Link
                href="https://faculty.psau.edu.sa/en/psau/facultymember/om.alqahtani"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
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
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Upload
              </Link>
              <Link
                href="/upload"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/WSU-Carbon-Lab/xray-atlas/issues/new/choose"
                className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
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
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  NIST RSoXR Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.bnl.gov/nsls2/beamlines/beamline.php?r=12-ID"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  NSLS II SMI & SST1 Beamlines
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.ansto.gov.au/facilities/australian-synchrotron/synchrotron-beamlines/soft-x-ray-spectroscopy#content-scientists"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  The Australian Synchrotron Soft X-ray Spectroscopy Beamline
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.monash.edu/engineering/chrismcneill"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
                >
                  Monash University Chris McNeill Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://weiyougroup.org/"
                  className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
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
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              className="text-sm text-gray-600 transition-colors hover:text-wsu-crimson hover:underline"
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
