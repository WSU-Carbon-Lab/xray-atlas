"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { LogOut, User, LayoutDashboard, Users } from "lucide-react";
import { DEV_MOCK_USER } from "~/lib/dev-mock-data";
import { Avatar } from "~/app/components/CustomUserButton";
import { ORCIDIcon } from "~/app/components/icons";

export function DevUserPanel() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || process.env.NODE_ENV !== "development") {
    return null;
  }

  const isDevUser = session?.user?.id === "00000000-0000-0000-0000-000000000000";
  const displayUser = session?.user ?? DEV_MOCK_USER;

  const handleAction = async (action: string) => {
    setIsOpen(false);

    if (!isDevUser) {
      try {
        const response = await fetch("/api/dev/auth", {
          method: "POST",
        });
        if (!response.ok) {
          console.error("Failed to set dev session");
          return;
        }
      } catch (error) {
        console.error("Failed to set dev session:", error);
        return;
      }
    }

    switch (action) {
      case "profile":
        window.location.href = `/users/${DEV_MOCK_USER.id}`;
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 z-50 flex -translate-y-1/2 items-center justify-center rounded-l-lg border border-gray-200 bg-white/90 backdrop-blur-sm px-2 py-3 shadow-lg transition-all hover:bg-white dark:border-gray-700 dark:bg-gray-800/90 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="Open dev user panel"
      >
        {displayUser.image ? (
          <Avatar user={displayUser} size="md" width={36} height={36} />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
            JS
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed right-0 top-0 z-50 h-full w-64 bg-white/95 backdrop-blur-xl dark:bg-gray-800/95 shadow-2xl">
            <div className="flex h-full flex-col border-l border-gray-200 dark:border-gray-700">
              <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {displayUser.image ? (
                    <Avatar user={displayUser} size="md" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                      JS
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <a
                      href={`/users/${DEV_MOCK_USER.id}`}
                      className="text-sm font-medium text-gray-900 transition-colors hover:text-accent dark:text-gray-100 dark:hover:text-accent-light"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleAction("profile");
                      }}
                    >
                      {DEV_MOCK_USER.name}
                    </a>
                    {DEV_MOCK_USER.orcid && (
                      <a
                        href={`https://orcid.org/${DEV_MOCK_USER.orcid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-accent dark:text-gray-400 dark:hover:text-accent-light"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ORCIDIcon className="h-3 w-3 shrink-0" authenticated />
                        <span className="tabular-nums">{DEV_MOCK_USER.orcid}</span>
                      </a>
                    )}
                    {DEV_MOCK_USER.email && (
                      <a
                        href={`mailto:${DEV_MOCK_USER.email}`}
                        className="text-xs text-gray-500 transition-colors hover:text-accent dark:text-gray-400 dark:hover:text-accent-light"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {DEV_MOCK_USER.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                <button
                  onClick={() => void handleAction("profile")}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm text-gray-400 dark:text-gray-500"
                  title="Coming soon"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm text-gray-400 dark:text-gray-500"
                  title="Coming soon"
                >
                  <Users className="h-4 w-4" />
                  Create Team
                </button>
              </div>
              <div className="border-t border-gray-200 py-1 dark:border-gray-700">
                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm text-gray-400 dark:text-gray-500"
                  title="Dev mode - logout disabled"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
