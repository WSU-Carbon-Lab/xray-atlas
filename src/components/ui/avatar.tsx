"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User as UserIcon, LayoutDashboard, Users } from "lucide-react";
import type { User as NextAuthUser } from "next-auth";
import { trpc } from "~/trpc/client";
import { ORCIDIcon } from "~/app/components/icons";
import { Button, Avatar, Tooltip, type AvatarProps } from "@heroui/react";

export type UserWithOrcid = NextAuthUser & {
  orcid?: string | null;
};

const profileImage = (user: UserWithOrcid) => {
  if (user.image) {
    return user.image;
  }
  const colorVariants = ["blue", "green", "purple", "orange", "red"];
  const randomColor =
    colorVariants[Math.floor(Math.random() * colorVariants.length)];
  return `https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/${randomColor}.jpg`;
};

interface AvatarButtonProps {
  user: UserWithOrcid;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  handleAction: (action: string) => void;
}

interface CustomAvatarProps extends React.ComponentProps<typeof Avatar> {
  user: UserWithOrcid;
}

export const CustomAvatar = ({
  user,
  size = "md",
  className,
  ...rest
}: CustomAvatarProps) => {
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";
  const showImage = Boolean(user.image && user.image.trim());
  return (
    <Avatar size={size} className={className} {...rest}>
      {showImage ? (
        <Avatar.Image
          alt={user.name ?? "User"}
          src={user.image ?? ""}
          className="rounded-full"
        />
      ) : null}
      <Avatar.Fallback className="text-xs">
        {initials.length > 0 ? initials.slice(0, 2) : "U"}
      </Avatar.Fallback>
    </Avatar>
  );
};

export function AvatarButton({
  user,
  isOpen,
  setIsOpen,
  handleAction,
}: AvatarButtonProps) {
  return (
    <div className="relative">
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="focus-visible:ring-accent flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CustomAvatar user={user} size="md" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-full right-0 z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <CustomAvatar user={user} size="md" />
                <div className="flex flex-col gap-0.5">
                  <a
                    href={`/users/${user.id}`}
                    className="hover:text-accent dark:hover:text-accent-light text-sm font-medium text-gray-900 transition-colors dark:text-gray-100"
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
                      className="hover:text-accent dark:hover:text-accent-light flex items-center gap-1.5 text-xs text-gray-500 transition-colors dark:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ORCIDIcon className="h-3 w-3 shrink-0" authenticated />
                      <span className="tabular-nums">{user.orcid}</span>
                    </a>
                  )}
                  {user.email && (
                    <a
                      href={`mailto:${user.email}`}
                      className="hover:text-accent dark:hover:text-accent-light text-xs text-gray-500 transition-colors dark:text-gray-400"
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
    if (
      user?.id &&
      !user.image &&
      !updateImage.isPending &&
      !updateImage.isSuccess
    ) {
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
  }, [
    user?.id,
    user?.image,
    updateImage.isPending,
    updateImage.isSuccess,
    updateImage,
    updateSession,
    utils,
  ]);

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

interface AvatarGroupProps extends React.ComponentProps<typeof Avatar> {
  users?: UserWithOrcid[];
  max?: number;
}

const avatarSizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

export function AvatarGroup({
  users = [],
  max = 3,
  size = "md",
}: AvatarGroupProps) {
  const sizeClass = avatarSizeClasses[size] ?? avatarSizeClasses.md;
  const constrainedClass = `${sizeClass} min-h-0 min-w-0 shrink-0`;

  if (!users || users.length === 0) {
    return (
      <div className="flex -space-x-2.5 overflow-visible">
        <span
          className={`bg-surface-1 relative z-0 flex overflow-hidden rounded-full shadow-sm ${sizeClass}`}
        >
          <CustomAvatar
            size={size}
            user={{ name: "?" }}
            className={constrainedClass}
          />
        </span>
      </div>
    );
  }

  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div
      className="flex -space-x-2.5 overflow-visible transition-[margin] duration-200 hover:space-x-1"
      role="group"
    >
      {displayUsers.map((user) => (
        <Tooltip key={user.id} delay={0}>
          <span
            className={`bg-surface-1 relative z-0 flex shrink-0 overflow-hidden rounded-full shadow-sm ${sizeClass}`}
          >
            <CustomAvatar size={size} user={user} className={constrainedClass} />
          </span>
          <Tooltip.Content showArrow>
            <Tooltip.Arrow />
            <p>{user.name ?? "User"}</p>
          </Tooltip.Content>
        </Tooltip>
      ))}
      {remaining > 0 ? (
        <span
          className={`bg-surface-2 text-text-primary relative z-10 flex shrink-0 items-center justify-center rounded-full font-bold shadow-sm ${
            size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
          }`}
          title={`${remaining} more`}
        >
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}
