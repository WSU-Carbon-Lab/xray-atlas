"use client";

import Link from "next/link";
import { trpc } from "~/trpc/client";
import {
  BeakerIcon,
  ChartBarIcon,
  CircleStackIcon,
  AcademicCapIcon,
  LinkIcon,
  BookOpenIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

export default function AboutPage() {
  const { data: collaboratorsData, isLoading: isLoadingCollaborators } =
    trpc.collaborators.getAll.useQuery();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-gray-100">
            About X-ray Atlas
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Advancing material research through collaborative data
          </p>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <InformationCircleIcon className="h-6 w-6 text-wsu-crimson" />
              What is X-ray Atlas?
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                X-ray Atlas is an open-access database and web platform designed
                to make Near-Edge X-ray Absorption Fine Structure (NEXAFS)
                spectroscopy data discoverable and usable by the wider scientific
                community. Our mission is to accelerate material research by
                providing researchers with easy access to high-quality,
                well-documented experimental data.
              </p>
              <p>
                The platform enables researchers to browse, search, and download
                NEXAFS spectra, explore experimental conditions, and contribute
                their own data to build a comprehensive resource for the
                materials science community.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <BookOpenIcon className="h-6 w-6 text-wsu-crimson" />
              Understanding NEXAFS Spectroscopy
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                Near-Edge X-ray Absorption Fine Structure (NEXAFS) spectroscopy,
                also known as X-ray Absorption Near-Edge Structure (XANES), is
                a powerful analytical technique used to study the electronic
                structure and chemical bonding of materials.
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Key Principles:
                </h3>
                <ul className="ml-6 list-disc space-y-1">
                  <li>
                    NEXAFS measures the absorption of X-rays by core electrons
                    in atoms, providing element-specific information
                  </li>
                  <li>
                    The technique is sensitive to the local chemical
                    environment, bonding geometry, and electronic structure
                  </li>
                  <li>
                    It is particularly powerful for studying organic materials,
                    polymers, and surfaces
                  </li>
                  <li>
                    Polarization-dependent measurements reveal molecular
                    orientation and alignment
                  </li>
                </ul>
              </div>
              <p>
                NEXAFS spectroscopy is widely used in materials science,
                chemistry, physics, and engineering to characterize thin films,
                interfaces, and bulk materials. The technique provides unique
                insights into molecular structure, chemical composition, and
                electronic properties that are difficult to obtain through other
                methods.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <CircleStackIcon className="h-6 w-6 text-wsu-crimson" />
              Data Representation and Structure
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                X-ray Atlas organizes experimental data using a structured
                approach that captures the full context of each measurement:
              </p>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Molecules and Samples
                  </h3>
                  <p className="text-sm">
                    Each entry includes comprehensive molecular information:
                    IUPAC names, chemical formulas, SMILES notation, InChI
                    identifiers, and common synonyms. Sample preparation details
                    such as processing methods, substrates, solvents, and
                    thickness are recorded to provide full experimental context.
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Experimental Conditions
                  </h3>
                  <p className="text-sm">
                    All experiments include detailed metadata: measurement date,
                    instrument and facility information, edge type (K, L, M),
                    polarization geometry (polar and azimuthal angles), and
                    detection mode (total electron yield, partial electron yield,
                    fluorescence yield, or transmission).
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Spectral Data
                  </h3>
                  <p className="text-sm">
                    Spectra are stored with both raw and processed absorption
                    values, energy calibration information, and reference
                    standards when applicable. Peak assignments and analysis
                    results can be associated with each spectrum.
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Quality Metrics
                  </h3>
                  <p className="text-sm">
                    Each experiment includes quality indicators such as
                    signal-to-noise ratios, user ratings, and community
                    upvotes to help researchers identify high-quality datasets.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <ChartBarIcon className="h-6 w-6 text-wsu-crimson" />
              Platform Features
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Advanced Search and Browse
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Search by molecule name, chemical formula, CAS number, or
                  browse by facility. Filter results by edge type, detection
                  mode, and experimental conditions.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Interactive Data Visualization
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View and compare spectra with interactive plots. Overlay
                  multiple datasets, zoom, and export data in various formats.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Data Contribution Tools
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Easy-to-use upload interfaces for molecules, facilities, and
                  NEXAFS experiments. Built-in validation and data quality
                  checks ensure consistency.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Community Features
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upvote high-quality datasets, add comments, and contribute
                  peak assignments. Link experiments to publications for proper
                  attribution.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Peak Analysis Tools
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Automated peak detection and assignment tools help identify
                  characteristic absorption features and transitions in your
                  spectra.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Export and Integration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Download spectra in CSV, JSON, or other standard formats.
                  Access data programmatically through our API for integration
                  with analysis workflows.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <LinkIcon className="h-6 w-6 text-wsu-crimson" />
              Contributing Data
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                We welcome contributions from researchers worldwide. Contributing
                your data helps build a comprehensive resource for the materials
                science community.
              </p>
              <div className="rounded-lg border border-gray-200 bg-blue-50 p-4 dark:border-gray-700 dark:bg-blue-900/20">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  How to Contribute:
                </h3>
                <ol className="ml-6 list-decimal space-y-2">
                  <li>
                    <Link
                      href="/contribute"
                      className="text-wsu-crimson hover:underline"
                    >
                      Sign in and review the contribution agreement
                    </Link>
                  </li>
                  <li>
                    Choose your contribution type: NEXAFS experiments, molecules,
                    or facilities
                  </li>
                  <li>
                    Upload your data using our guided upload forms with
                    built-in validation
                  </li>
                  <li>
                    Add metadata including experimental conditions, sample
                    preparation details, and references
                  </li>
                  <li>
                    Review and submit your contribution for inclusion in the
                    database
                  </li>
                </ol>
              </div>
              <p>
                All contributions are made available under an open data license,
                ensuring maximum utility for the research community. Contributors
                receive proper attribution, and experiments can be linked to
                publications.
              </p>
              <div className="flex justify-center">
                <Link
                  href="/contribute"
                  className="rounded-lg bg-wsu-crimson px-6 py-3 text-white transition-colors hover:bg-wsu-crimson-dark"
                >
                  Start Contributing
                </Link>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <AcademicCapIcon className="h-6 w-6 text-wsu-crimson" />
              Core Contributors
            </h2>
            <div className="space-y-6">
              {isLoadingCollaborators ? (
                <div className="text-center text-gray-600 dark:text-gray-400">
                  Loading contributors...
                </div>
              ) : (
                <>
                  {collaboratorsData?.hosts &&
                    collaboratorsData.hosts.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Hosted By
                        </h3>
                        <ul className="space-y-2">
                          {collaboratorsData.hosts.map((host) => (
                            <li key={host.id}>
                              {host.url ? (
                                <Link
                                  href={host.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-wsu-crimson hover:underline"
                                >
                                  {host.name}
                                </Link>
                              ) : (
                                <span className="text-gray-700 dark:text-gray-300">
                                  {host.name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {collaboratorsData?.collaborators &&
                    collaboratorsData.collaborators.length > 0 && (
                      <div>
                        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                          Collaborators
                        </h3>
                        <ul className="space-y-2">
                          {collaboratorsData.collaborators.map((collab) => (
                            <li key={collab.id}>
                              {collab.url ? (
                                <Link
                                  href={collab.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-wsu-crimson hover:underline"
                                >
                                  {collab.name}
                                </Link>
                              ) : (
                                <span className="text-gray-700 dark:text-gray-300">
                                  {collab.name}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {(!collaboratorsData?.hosts ||
                    collaboratorsData.hosts.length === 0) &&
                    (!collaboratorsData?.collaborators ||
                      collaboratorsData.collaborators.length === 0) && (
                      <p className="text-gray-600 dark:text-gray-400">
                        Contributor information will be displayed here.
                      </p>
                    )}
                </>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-gray-900 dark:text-gray-100">
              <BeakerIcon className="h-6 w-6 text-wsu-crimson" />
              Getting Started
            </h2>
            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                Ready to explore the database? Here are some ways to get
                started:
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Link
                  href="/browse"
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-wsu-crimson hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Browse Molecules
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Explore our collection of molecules and their NEXAFS spectra
                  </p>
                </Link>

                <Link
                  href="/browse/facilities"
                  className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-wsu-crimson hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                >
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Browse Facilities
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Discover synchrotron facilities and instruments in our
                    database
                  </p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
