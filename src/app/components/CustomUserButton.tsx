"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings, User, LayoutDashboard, Users } from "lucide-react";
import Image from "next/image";

export function CustomUserButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const user = session?.user;

  if (!user) {
    return null;
  }

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const handleAction = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case "logout":
        handleLogout();
        break;
      case "profile":
        router.push(`/users/${user.id}`);
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? "User"}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
            {userInitials}
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
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-white">
                    {userInitials}
                  </div>
                )}
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {user.name ?? "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleAction("profile")}
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
                <Settings className="h-4 w-4" />
                Settings
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
                onClick={() => handleAction("logout")}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
