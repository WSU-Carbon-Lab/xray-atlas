"use client";
import Link from "next/link";
import { WSULogoIcon } from "./icons";
import GitHubStarsLink from "./GitHubStarsLink";
import { trpc } from "~/trpc/client";

export function Footer() {
  const { data: collaboratorsData, isLoading: isLoadingCollaborators } =
    trpc.collaborators.getAll.useQuery();

  return (
    <footer className="border-t border-default bg-content2">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WSULogoIcon className="h-6 w-6" />
            <span className="font-sans text-xl font-semibold text-foreground">
              X-ray Atlas
            </span>
          </div>
          <div className="flex items-center gap-3 text-2xl">
            <GitHubStarsLink />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-8">
          <div className="col-span-3 space-y-4">
            <h3 className="font-sans text-lg text-foreground">
              X-ray Atlas
            </h3>
            <p className="flex-wrap text-sm text-foreground-500">
              Advancing material research through collaborative data.
            </p>
            {isLoadingCollaborators ? (
              <div className="text-sm text-foreground-500">Loading...</div>
            ) : (
              <>
                {collaboratorsData?.hosts &&
                  collaboratorsData.hosts.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Hosted By
                      </h4>
                      <div className="space-y-1">
                        {collaboratorsData.hosts.map((host) => (
                          <p key={host.id} className="text-sm text-foreground-500">
                            {host.url ? (
                              <Link
                                href={host.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-accent dark:text-accent-light transition-colors hover:underline"
                              >
                                {host.name}
                              </Link>
                            ) : (
                              <span>{host.name}</span>
                            )}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
          <div className="col-span-1 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Quick Links
            </h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="/browse"
                className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
              >
                Browse
              </Link>
              <Link
                href="/contribute"
                className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
              >
                Contribute
              </Link>
              <Link
                href="/about"
                className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
              >
                About
              </Link>
              <Link
                href="mailto:brian.collins@wsu.edu"
                className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="col-span-4 space-y-4">
            <h4 className="text-sm font-semibold text-foreground">
              Collaborators
            </h4>
            {isLoadingCollaborators ? (
              <div className="text-sm text-foreground-500">Loading...</div>
            ) : (
              <>
                {collaboratorsData?.collaborators &&
                collaboratorsData.collaborators.length > 0 ? (
                  <ul className="space-y-2 text-sm text-foreground-500">
                    {collaboratorsData.collaborators.map((collab) => (
                      <li key={collab.id}>
                        {collab.url ? (
                          <Link
                            href={collab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent dark:text-accent-light transition-colors hover:underline"
                          >
                            {collab.name}
                          </Link>
                        ) : (
                          <span>{collab.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground-500">
                    No collaborators listed yet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-between border-t border-default pt-4 md:flex-row">
          <div className="text-center text-sm text-foreground-500 md:text-left">
            © {new Date().getFullYear()} X-ray Atlas. All rights reserved.
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm md:mt-0 md:justify-end">
            <Link
              href="/privacy"
              className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent dark:text-accent-light text-sm text-foreground-500 transition-colors hover:underline"
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
