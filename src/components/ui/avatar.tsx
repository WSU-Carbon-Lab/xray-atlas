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
  tooltipVariant?: "name" | "name-orcid";
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
  tooltipVariant,
}: {
  user: UserWithOrcid;
  avatarWrapperClass: string;
  constrainedClass: string;
  size: "sm" | "md" | "lg";
  tooltipVariant: "name" | "name-orcid";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el || typeof document === "undefined") return;
    const rect = el.getBoundingClientRect();
    setPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openTooltip = () => {
    updatePosition();
    clearCloseTimer();
    setIsOpen(true);
  };

  const scheduleCloseTooltip = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 90);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const userName = user.name ?? "User";
  const orcidValue = user.orcid?.trim();
  const orcidLabel = orcidValue ?? "Not linked";
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
        onMouseEnter={openTooltip}
        onMouseLeave={scheduleCloseTooltip}
        onFocus={openTooltip}
        onBlur={scheduleCloseTooltip}
      >
        {triggerElement}
      </span>
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`z-tooltip fixed -translate-x-1/2 -translate-y-full ${
              tooltipVariant === "name-orcid" ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ left: position.left, top: position.top }}
          >
            {tooltipVariant === "name-orcid" ? (
              <div
                className="relative w-[min(15rem,calc(100vw-1rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-2.5 py-2 shadow-2xl backdrop-blur-sm"
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleCloseTooltip}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  {user.id ? (
                    <Link
                      href={`/users/${user.id}`}
                      className="focus-visible:ring-accent block truncate rounded-sm text-sm font-semibold text-zinc-100 transition-colors hover:text-accent dark:hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
                      aria-label={`View ${userName}'s profile`}
                      title={userName}
                    >
                      {userName}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-semibold text-zinc-100" title={userName}>
                      {userName}
                    </p>
                  )}
                  {orcidValue ? (
                    <a
                      href={`https://orcid.org/${orcidValue}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-visible:ring-accent inline-flex min-w-0 items-center gap-1.5 rounded-sm font-mono text-sm text-zinc-300 tabular-nums transition-colors hover:text-accent dark:hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
                      aria-label={`Open ORCID profile ${orcidValue}`}
                      title={orcidValue}
                    >
                      <ORCIDIcon className="h-3.5 w-3.5 shrink-0" authenticated />
                      <span className="min-w-0 truncate">{orcidValue}</span>
                    </a>
                  ) : (
                    <p className="inline-flex min-w-0 items-center gap-1.5 font-mono text-sm text-zinc-400 tabular-nums">
                      <ORCIDIcon className="h-3.5 w-3.5 shrink-0 opacity-70" authenticated />
                      <span className="min-w-0 truncate">{orcidLabel}</span>
                    </p>
                  )}
                </div>
                <div className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-700/80 bg-zinc-900/95" />
              </div>
            ) : (
              <div className="bg-foreground text-background rounded-full px-2.5 py-1 text-sm font-medium shadow-lg">
                {userName}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

function AvatarTrigger({
  user,
  avatarWrapperClass,
  constrainedClass,
  size,
  onActivate,
  onDeactivate,
}: {
  user: UserWithOrcid;
  avatarWrapperClass: string;
  constrainedClass: string;
  size: "sm" | "md" | "lg";
  onActivate: (user: UserWithOrcid, triggerEl: HTMLSpanElement) => void;
  onDeactivate: () => void;
}) {
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
    <span
      className="inline-flex shrink-0"
      onMouseEnter={(event) => onActivate(user, event.currentTarget)}
      onMouseLeave={onDeactivate}
      onFocus={(event) => onActivate(user, event.currentTarget)}
      onBlur={onDeactivate}
    >
      {triggerElement}
    </span>
  );
}

export function AvatarGroup({
  users = [],
  max = 5,
  size = "md",
  tooltipVariant = "name",
}: AvatarGroupProps) {
  const sizeClass = avatarSizeClasses[size] ?? avatarSizeClasses.md;
  const constrainedClass = `${sizeClass} min-h-0 min-w-0 shrink-0`;
  const avatarWrapperClass = `bg-surface-1 relative z-0 flex shrink-0 overflow-hidden rounded-full shadow-sm hover:z-20 ${sizeClass}`;
  const groupRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSharedTooltipOpen, setIsSharedTooltipOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserWithOrcid | null>(null);
  const [sharedTooltipPosition, setSharedTooltipPosition] = useState({
    left: 0,
    top: 0,
    arrowOffset: 0,
  });

  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updateSharedTooltipPosition = () => {
    if (!groupRef.current || !triggerRef.current) {
      return;
    }
    const groupRect = groupRef.current.getBoundingClientRect();
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const left = groupRect.left + groupRect.width / 2;
    const triggerCenter = triggerRect.left + triggerRect.width / 2;
    const maxArrowOffset = 104;
    const rawOffset = triggerCenter - left;
    const arrowOffset = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, rawOffset));
    setSharedTooltipPosition({
      left,
      top: triggerRect.top - 8,
      arrowOffset,
    });
  };

  const openSharedTooltip = (user: UserWithOrcid, triggerEl: HTMLSpanElement) => {
    clearCloseTimer();
    triggerRef.current = triggerEl;
    setActiveUser(user);
    if (!isSharedTooltipOpen) {
      setIsSharedTooltipOpen(true);
    }
    updateSharedTooltipPosition();
  };

  const scheduleSharedTooltipClose = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setIsSharedTooltipOpen(false);
      closeTimerRef.current = null;
    }, 100);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!isSharedTooltipOpen || tooltipVariant !== "name-orcid") {
      return;
    }
    const handleViewportChange = () => {
      updateSharedTooltipPosition();
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isSharedTooltipOpen, tooltipVariant]);

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

  return (
    <>
      <div
        ref={groupRef}
        className="flex -space-x-2.5 overflow-visible"
        role="group"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleSharedTooltipClose}
      >
        {displayUsers.map((user) =>
          tooltipVariant === "name-orcid" ? (
            <AvatarTrigger
              key={user.id ?? user.name ?? "user"}
              user={user}
              avatarWrapperClass={avatarWrapperClass}
              constrainedClass={constrainedClass}
              size={size}
              onActivate={openSharedTooltip}
              onDeactivate={scheduleSharedTooltipClose}
            />
          ) : (
            <AvatarWithTooltip
              key={user.id ?? user.name ?? "user"}
              user={user}
              avatarWrapperClass={avatarWrapperClass}
              constrainedClass={constrainedClass}
              size={size}
              tooltipVariant={tooltipVariant}
            />
          ),
        )}
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
      {tooltipVariant === "name-orcid" &&
      isSharedTooltipOpen &&
      activeUser &&
      typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-tooltip pointer-events-auto fixed -translate-x-1/2 -translate-y-full"
              style={{
                left: sharedTooltipPosition.left,
                top: sharedTooltipPosition.top,
              }}
            >
              <div
                className="relative w-[min(15rem,calc(100vw-1rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-2.5 py-2 shadow-2xl backdrop-blur-sm"
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleSharedTooltipClose}
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  {activeUser.id ? (
                    <Link
                      href={`/users/${activeUser.id}`}
                      className="focus-visible:ring-accent block truncate rounded-sm text-sm font-semibold text-zinc-100 transition-colors hover:text-accent dark:hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
                      aria-label={`View ${(activeUser.name ?? "User")}'s profile`}
                      title={activeUser.name ?? "User"}
                    >
                      {activeUser.name ?? "User"}
                    </Link>
                  ) : (
                    <p
                      className="truncate text-sm font-semibold text-zinc-100"
                      title={activeUser.name ?? "User"}
                    >
                      {activeUser.name ?? "User"}
                    </p>
                  )}
                  {activeUser.orcid?.trim() ? (
                    <a
                      href={`https://orcid.org/${activeUser.orcid.trim()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-visible:ring-accent inline-flex min-w-0 items-center gap-1.5 rounded-sm font-mono text-sm text-zinc-300 tabular-nums transition-colors hover:text-accent dark:hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
                      aria-label={`Open ORCID profile ${activeUser.orcid.trim()}`}
                      title={activeUser.orcid.trim()}
                    >
                      <ORCIDIcon className="h-3.5 w-3.5 shrink-0" authenticated />
                      <span className="min-w-0 truncate">{activeUser.orcid.trim()}</span>
                    </a>
                  ) : (
                    <p className="inline-flex min-w-0 items-center gap-1.5 font-mono text-sm text-zinc-400 tabular-nums">
                      <ORCIDIcon className="h-3.5 w-3.5 shrink-0 opacity-70" authenticated />
                      <span className="min-w-0 truncate">Not linked</span>
                    </p>
                  )}
                </div>
                <div
                  className="absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-700/80 bg-zinc-900/95 transition-[left] duration-150 ease-out"
                  style={{
                    left: `calc(50% + ${sharedTooltipPosition.arrowOffset}px)`,
                  }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
