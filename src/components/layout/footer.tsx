"use client";
import Link from "next/link";
import { WSULogoIcon } from "../icons";
import GitHubStarsLink from "./github-stars-link";
import { trpc } from "~/trpc/client";
import { attribution, mission, site } from "~/app/brand";

export function Footer() {
  const { data: collaboratorsData, isLoading: isLoadingCollaborators } =
    trpc.collaborators.getAll.useQuery();

  return (
    <footer className="border-border bg-surface border-t">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WSULogoIcon className="h-6 w-6" />
            <span className="text-foreground font-sans text-xl font-semibold">
              {site.name}
            </span>
          </div>
          <div className="flex items-center gap-3 text-2xl">
            <GitHubStarsLink />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-8">
          <div className="col-span-3 space-y-4">
            <h3 className="text-foreground font-sans text-lg">{site.name}</h3>
            <p className="text-muted flex-wrap text-sm">{mission.heroShort}</p>
            {isLoadingCollaborators ? (
              <div className="text-muted text-sm">Loading...</div>
            ) : (
              <>
                {collaboratorsData?.hosts &&
                  collaboratorsData.hosts.length > 0 && (
                    <div>
                      <h4 className="text-foreground mb-2 text-sm font-semibold">
                        Hosted by {attribution.lab}
                      </h4>
                      <div className="space-y-1">
                        {collaboratorsData.hosts.map((host) => (
                          <p key={host.id} className="text-muted text-sm">
                            {host.url ? (
                              <Link
                                href={host.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted hover:text-accent transition-colors hover:underline"
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
          <div className="col-span-2 space-y-4">
            <h4 className="text-foreground text-sm font-semibold">Resources</h4>
            <div className="flex flex-col space-y-2">
              <Link
                href="/wiki"
                className="text-muted hover:text-accent text-sm transition-colors hover:underline"
              >
                Wiki
              </Link>
              <Link
                href="/wiki/api"
                className="text-muted hover:text-accent text-sm transition-colors hover:underline"
              >
                API
              </Link>
              <Link
                href="mailto:brian.collins@wsu.edu"
                className="text-muted hover:text-accent text-sm transition-colors hover:underline"
              >
                Contact
              </Link>
            </div>
          </div>
          <div className="col-span-3 space-y-4">
            <h4 className="text-foreground text-sm font-semibold">
              Collaborators
            </h4>
            {isLoadingCollaborators ? (
              <div className="text-foreground-500 text-sm">Loading...</div>
            ) : (
              <>
                {collaboratorsData?.collaborators &&
                collaboratorsData.collaborators.length > 0 ? (
                  <ul className="text-muted space-y-2 text-sm">
                    {collaboratorsData.collaborators.map((collab) => (
                      <li key={collab.id}>
                        {collab.url ? (
                          <Link
                            href={collab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted hover:text-accent transition-colors hover:underline"
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
                  <p className="text-muted text-sm">
                    No collaborators listed yet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="border-border mt-8 flex flex-col justify-between border-t pt-4 md:flex-row">
          <div className="text-muted text-center text-sm md:text-left">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </div>
          <div className="mt-4 flex justify-center gap-4 text-sm md:mt-0 md:justify-end">
            <Link
              href="/privacy"
              className="text-muted hover:text-accent text-sm transition-colors hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="https://github.com/WSU-Carbon-Lab/xray-atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent text-sm transition-colors hover:underline"
            >
              GitHub
            </Link>
            <Link
              href="https://wsu.edu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-accent text-sm transition-colors hover:underline"
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
