"use client";

import { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Users,
  UserCog,
  FlaskConical,
} from "lucide-react";
import type { User as NextAuthUser } from "next-auth";
import { trpc } from "~/trpc/client";
import { ORCIDIcon } from "~/components/icons";
import { Button, Avatar } from "@heroui/react";

export type UserWithOrcid = NextAuthUser & {
  orcid?: string | null;
  canManageUsers?: boolean;
  canAccessLabs?: boolean;
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
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAction: (action: string) => void;
  showManageUsers?: boolean;
  showSandbox?: boolean;
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
  const showImage = Boolean(user.image?.trim());
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
  showManageUsers = false,
  showSandbox = false,
}: AvatarButtonProps) {
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (menuContainerRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  return (
    <div ref={menuContainerRef} className="relative">
      <Button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="border-border bg-surface focus-visible:ring-accent hover:bg-default flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={isOpen ? menuId : undefined}
      >
        <CustomAvatar user={user} size="md" />
      </Button>

      {isOpen && (
        <div
          id={menuId}
          className="border-border bg-surface absolute top-full right-0 z-50 mt-2 w-64 rounded-lg border shadow-lg"
        >
          <div className="border-border border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <CustomAvatar user={user} size="md" />
              <div className="flex flex-col gap-0.5">
                <a
                  href={`/users/${user.id}`}
                  className="text-foreground hover:text-accent text-sm font-medium transition-colors"
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
                    className="text-muted hover:text-accent flex items-center gap-1.5 text-xs transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ORCIDIcon className="h-3 w-3 shrink-0" authenticated />
                    <span className="tabular-nums">{user.orcid}</span>
                  </a>
                )}
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-muted hover:text-accent text-xs transition-colors"
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
              type="button"
              onClick={() => handleAction("profile")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              Profile
            </button>
            <button
              type="button"
              disabled
              className="text-muted flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm opacity-60"
              title="Coming soon"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              type="button"
              disabled
              className="text-muted flex w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm opacity-60"
              title="Coming soon"
            >
              <Users className="h-4 w-4" />
              Create Team
            </button>
          </div>
          {showManageUsers || showSandbox ? (
            <div className="border-border border-t py-1">
              {showManageUsers ? (
                <button
                  type="button"
                  onClick={() => handleAction("admin-users")}
                  className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                >
                  <UserCog className="h-4 w-4" />
                  Manage users
                </button>
              ) : null}
              {showSandbox ? (
                <button
                  type="button"
                  onClick={() => handleAction("sandbox")}
                  className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
                >
                  <FlaskConical className="h-4 w-4" />
                  Sandbox
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="border-border border-t py-1">
            <button
              onClick={() => handleAction("logout")}
              className="text-danger hover:bg-danger/10 flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        </div>
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
    user,
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
      case "admin-users":
        router.push("/admin/users");
        break;
      case "sandbox":
        router.push("/sandbox");
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const showSandbox =
    process.env.NODE_ENV === "development" ||
    Boolean(user.canAccessLabs) ||
    Boolean(user.canManageUsers);

  return (
    <AvatarButton
      user={user}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      handleAction={handleAction}
      showManageUsers={Boolean(user.canManageUsers)}
      showSandbox={showSandbox}
    />
  );
}

interface AvatarGroupProps extends React.ComponentProps<typeof Avatar> {
  users?: UserWithOrcid[];
  max?: number;
}

const avatarSizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;

function AvatarWithTooltip({
  user,
  avatarWrapperClass,
  constrainedClass,
  size,
}: {
  user: UserWithOrcid;
  avatarWrapperClass: string;
  constrainedClass: string;
  size: "sm" | "md" | "lg";
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el || typeof document === "undefined") return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 4,
    });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const userName = user.name ?? "User";
  const avatarElement = (
    <span className={avatarWrapperClass}>
      <CustomAvatar size={size} user={user} className={constrainedClass} />
    </span>
  );
  const triggerElement = user.id ? (
    <Link
      href={`/users/${user.id}`}
      aria-label={`View ${userName}'s profile`}
      className="focus-visible:ring-accent block focus:outline-none focus-visible:rounded-full focus-visible:ring-2 focus-visible:ring-offset-1"
    >
      {avatarElement}
    </Link>
  ) : (
    avatarElement
  );

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {triggerElement}
      </span>
      {isHovered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="z-tooltip pointer-events-none fixed -translate-x-1/2 -translate-y-full"
            style={{ left: position.left, top: position.top }}
          >
            <div className="bg-foreground text-background rounded-full px-2.5 py-1 text-sm font-medium shadow-lg">
              {userName}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function AvatarGroup({
  users = [],
  max = 5,
  size = "md",
}: AvatarGroupProps) {
  const sizeClass = avatarSizeClasses[size] ?? avatarSizeClasses.md;
  const constrainedClass = `${sizeClass} min-h-0 min-w-0 shrink-0`;
  const avatarWrapperClass = `bg-surface-1 relative z-0 flex shrink-0 overflow-hidden rounded-full shadow-sm hover:z-20 ${sizeClass}`;

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
    <div className="flex -space-x-2.5 overflow-visible" role="group">
      {displayUsers.map((user) => (
        <AvatarWithTooltip
          key={user.id ?? user.name ?? "user"}
          user={user}
          avatarWrapperClass={avatarWrapperClass}
          constrainedClass={constrainedClass}
          size={size}
        />
      ))}
      {remaining > 0 ? (
        <span
          className={`bg-surface-2 text-text-primary relative z-10 flex shrink-0 items-center justify-center rounded-full font-bold shadow-sm ${
            size === "sm" ? "h-8 w-8 text-[10px]" : "h-9 w-9 text-xs"
          }`}
          title={`${remaining} more`}
        >
          +{remaining}
        </span>
      ) : null}
    </div>
  );
}
