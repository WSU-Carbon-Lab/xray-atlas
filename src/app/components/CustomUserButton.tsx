"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon, LayoutDashboard, Users } from "lucide-react";
import Image from "next/image";
import type { User as NextAuthUser } from "next-auth";
import { trpc } from "~/trpc/client";
import { ORCIDIcon } from "~/app/components/icons";

type UserWithOrcid = NextAuthUser & {
  orcid?: string | null;
};

type AvatarUser = {
  image?: string | null;
  name?: string | null;
};

const profileImage = (user: UserWithOrcid) => {
  if (user.image) {
    return user.image;
  }
  const colorVariants = ["blue", "green", "purple", "orange", "red"];
  const randomColor = colorVariants[Math.floor(Math.random() * colorVariants.length)];
  return `https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/${randomColor}.jpg`;
};

interface AvatarButtonProps {
  user: UserWithOrcid;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleAction: (action: string) => void;
}

interface AvatarProps {
  user: AvatarUser;
  size?: "sm" | "md" | "lg";
  width?: number;
  height?: number;
  className?: string;
}

const sizeMap = {
  sm: { width: 20, height: 20 },
  md: { width: 40, height: 40 },
  lg: { width: 96, height: 96 },
} as const;

export function Avatar({
  user,
  size = "sm",
  width,
  height,
  className = "",
}: AvatarProps) {
  if (!user.image) {
    return null;
  }

  const dimensions = width && height
    ? { width, height }
    : sizeMap[size];

  return (
    <Image
      src={user.image}
      alt={user.name ?? "User"}
      width={dimensions.width}
      height={dimensions.height}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

export function AvatarButton({
  user,
  isOpen,
  setIsOpen,
  handleAction,
}: AvatarButtonProps) {
  if (!user.image) {
    return null;
  }

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
        <Avatar user={user} size="md" width={36} height={36} />
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
                <Avatar user={user} size="md" />
                <div className="flex flex-col gap-0.5">
                  <a
                    href={`/users/${user.id}`}
                    className="text-sm font-medium text-gray-900 transition-colors hover:text-accent dark:text-gray-100 dark:hover:text-accent-light"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction("profile");
                    }}
                  >
                    {user.name ?? "User"}
                  </a>
                  {user.orcid && (
                    <a
                      href={`https://orcid.org/${user.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-accent dark:text-gray-400 dark:hover:text-accent-light"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ORCIDIcon className="h-3 w-3 shrink-0" authenticated />
                      <span className="tabular-nums">{user.orcid}</span>
                    </a>
                  )}
                  {user.email && (
                    <a
                      href={`mailto:${user.email}`}
                      className="text-xs text-gray-500 transition-colors hover:text-accent dark:text-gray-400 dark:hover:text-accent-light"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {user.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleAction("profile")}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <UserIcon className="h-4 w-4" />
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

export function CustomUserButton() {
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const updateImage = trpc.users.updateImage.useMutation();
  const utils = trpc.useUtils();

  const user = session?.user;

  useEffect(() => {
    if (user?.id && !user.image && !updateImage.isPending && !updateImage.isSuccess) {
      const generatedImage = profileImage(user);
      void updateImage.mutateAsync(
        { image: generatedImage },
        {
          onSuccess: () => {
            void updateSession();
            void utils.users.getCurrent.invalidate();
          },
        },
      );
    }
  }, [user?.id, user?.image, updateImage.isPending, updateImage.isSuccess, updateImage, updateSession, utils]);

  if (!user) {
    return null;
  }

  if (!user.image) {
    return null;
  }

  const handleAction = (action: string) => {
    setIsOpen(false);
    switch (action) {
      case "logout":
        void handleLogout();
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
    <AvatarButton
      user={user}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      handleAction={handleAction}
    />
  );
}
