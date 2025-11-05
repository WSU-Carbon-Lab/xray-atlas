"use client";
import Link from "next/link";
import { WSULogoIcon } from "./icons";
import GitHubStarsLink from "./GitHubStarsLink";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WSULogoIcon className="h-6 w-6" />
            <span className="font-sans text-xl font-semibold text-gray-900 dark:text-gray-100">
              X-ray Atlas
            </span>
          </div>
          <div className="flex items-center gap-3 text-2xl">
            <GitHubStarsLink />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-8">
          <div className="col-span-3 space-y-4">
            <h3 className="font-sans text-lg text-gray-900 dark:text-gray-100">
              Xray Atlas
            </h3>
            <p className="flex-wrap text-sm text-gray-600 dark:text-gray-400">
              Advancing material research through collaborative data.
            </p>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Hosted By
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <Link
                href="https://labs.wsu.edu/carbon/"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
              >
                Washington State University · Collins Research Group
              </Link>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <Link
                href="https://faculty.psau.edu.sa/en/psau/facultymember/om.alqahtani"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
              >
                Prince Sattam bin Abdulaziz University · Obaid Alqahtani
              </Link>
            </p>
          </div>
          <div className="col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Quick Links
            </h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="/upload"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
              >
                Upload
              </Link>
              <Link
                href="/about"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
              >
                About
              </Link>
              <Link
                href="mailto:brian.collins@wsu.edu"
                className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="col-span-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Collaborators
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link
                  href="https://www.nist.gov/mml/materials-science-and-engineering-division/polymers-processing-group"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
                >
                  NIST RSoXR Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.bnl.gov/nsls2/beamlines/beamline.php?r=12-ID"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
                >
                  NSLS II SMI & SST1 Beamlines
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.ansto.gov.au/facilities/australian-synchrotron/synchrotron-beamlines/soft-x-ray-spectroscopy#content-scientists"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
                >
                  The Australian Synchrotron Soft X-ray Spectroscopy Beamline
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.monash.edu/engineering/chrismcneill"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
                >
                  Monash University Chris McNeill Group
                </Link>
              </li>
              <li>
                <Link
                  href="https://weiyougroup.org/"
                  className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
                >
                  The University of North Carolina at Chapel Hill You Group
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between border-t border-gray-200 pt-4 md:flex-row dark:border-gray-700">
          <div className="text-center text-sm text-gray-600 md:text-left dark:text-gray-400">
            © {new Date().getFullYear()} X-ray Atlas. All rights reserved.
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm md:mt-0 md:justify-end">
            <Link
              href="/privacy"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              className="hover:text-wsu-crimson text-sm text-gray-600 transition-colors hover:underline dark:text-gray-400"
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
