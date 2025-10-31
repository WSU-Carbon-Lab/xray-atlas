"use client";
import Link from "next/link";
import { WSULogoIcon } from "./icons";
import GitHubStarsLink from "./GitHubStarsLink";

export function Footer() {
  return (
    <footer className="bg-background/50 border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WSULogoIcon className="h-6 w-6" />
            <span className="font-sans text-xl font-semibold">X-ray Atlas</span>
          </div>
          <div className="flex items-center gap-3 text-2xl">
            <GitHubStarsLink />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-8">
          <div className="col-span-3 space-y-4">
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
          <div className="col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Quick Links</h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="/upload"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Upload
              </Link>
              <Link
                href="/about"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                About
              </Link>
              <Link
                href="mailto:brian.collins@wsu.edu"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="col-span-4 space-y-4">
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
export default Footer;
