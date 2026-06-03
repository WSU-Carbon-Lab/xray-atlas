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
  Bell,
} from "lucide-react";
import type { User as NextAuthUser } from "next-auth";
import { ORCIDIcon } from "~/components/icons";
import { Avatar, Badge, Button } from "@heroui/react";
import { cn } from "@heroui/styles";
import type { ResearcherAttributionBadgeStatus } from "~/lib/nexafs-attribution";

export type UserWithOrcid = NextAuthUser & {
  orcid?: string | null;
  canManageUsers?: boolean;
  canAccessLabs?: boolean;
  tooltipSubtitle?: string | null;
  isAtlasProfile?: boolean;
  /** Stable React key for stacked avatars when one ORCID has multiple roles. */
  avatarStackKey?: string;
  attributionBadgeStatus?: ResearcherAttributionBadgeStatus;
};

/** Returns a profile image URL suitable for display, or null when missing. */
export function normalizeProfileImageUrl(
  image: string | null | undefined,
): string | null {
  const trimmed = image?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

const HEROUI_PLACEHOLDER_AVATAR_URL_PREFIX =
  "https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/";
const atlasGradientFallbackClasses = [
  "bg-gradient-to-br from-pink-500 to-purple-500",
  "bg-gradient-to-br from-indigo-500 to-cyan-500",
  "bg-gradient-to-br from-emerald-500 to-teal-500",
  "bg-gradient-to-br from-orange-500 to-rose-500",
] as const;
const nonAtlasInitialsFallbackClassName =
  "border border-border bg-surface text-foreground";
const researcherAvatarInitialsSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

function hashAvatarSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function atlasGradientFallbackClass(seed: string): string {
  if (!seed) {
    return atlasGradientFallbackClasses[0];
  }
  const hash = hashAvatarSeed(seed);
  return atlasGradientFallbackClasses[hash % atlasGradientFallbackClasses.length]!;
}

function isGeneratedPlaceholderAvatarUrl(
  imageUrl: string | null | undefined,
): boolean {
  if (!imageUrl) {
    return false;
  }
  return imageUrl.startsWith(HEROUI_PLACEHOLDER_AVATAR_URL_PREFIX);
}

type AvatarFallbackStyle = {
  imageUrl: string | null;
  fallbackClassName: string;
};

function shouldUseAvatarIconFallback(params: {
  isAtlasProfile: boolean;
  initials: string;
}): boolean {
  if (!params.isAtlasProfile) {
    return false;
  }
  return params.initials.length === 0;
}

function resolveAvatarFallbackStyle(params: {
  imageUrl: string | null | undefined;
  isAtlasProfile: boolean;
  hasIconFallback: boolean;
  gradientSeed: string;
}): AvatarFallbackStyle {
  const resolvedImageUrl = normalizeProfileImageUrl(params.imageUrl);
  const hasGeneratedPlaceholder = isGeneratedPlaceholderAvatarUrl(resolvedImageUrl);
  const imageUrl = hasGeneratedPlaceholder ? null : resolvedImageUrl;
  if (imageUrl) {
    return {
      imageUrl,
      fallbackClassName: "text-xs",
    };
  }
  if (!params.isAtlasProfile) {
    return {
      imageUrl: null,
      fallbackClassName: nonAtlasInitialsFallbackClassName,
    };
  }
  if (params.hasIconFallback) {
    return {
      imageUrl: null,
      fallbackClassName: "bg-muted/40 text-muted",
    };
  }
  return {
    imageUrl: null,
    fallbackClassName: `${atlasGradientFallbackClass(params.gradientSeed)} border-none text-white`,
  };
}

interface AvatarButtonProps {
  user: UserWithOrcid;
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleAction: (action: string) => void;
  showManageUsers?: boolean;
  showSandbox?: boolean;
  pendingAttributionCount?: number;
}

interface CustomAvatarProps extends React.ComponentProps<typeof Avatar> {
  user: UserWithOrcid;
}

function displayInitialsFromName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter((part) => part.length > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export type ResearcherAvatarProps = {
  displayName?: string | null;
  imageUrl?: string | null;
  identitySeed?: string | null;
  isAtlasProfile?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  attributionBadgeStatus?: ResearcherAttributionBadgeStatus;
};

function avatarIdentitySeedFromInputs(
  ...values: (string | null | undefined)[]
): string {
  return firstNonEmptyOrcidOrId(...values);
}

function badgeColorForStatus(
  status: ResearcherAttributionBadgeStatus,
): "danger" | "warning" | "success" {
  if (status === "unclaimed") return "danger";
  if (status === "pending_agreement") return "warning";
  return "success";
}

export function ResearcherAvatar({
  displayName,
  imageUrl,
  identitySeed,
  isAtlasProfile = false,
  size = "sm",
  className,
  attributionBadgeStatus,
}: ResearcherAvatarProps) {
  const initials = displayInitialsFromName(displayName);
  const showIconFallback = shouldUseAvatarIconFallback({
    isAtlasProfile,
    initials,
  });
  const fallbackStyle = resolveAvatarFallbackStyle({
    imageUrl,
    isAtlasProfile,
    hasIconFallback: showIconFallback,
    gradientSeed: avatarIdentitySeedFromInputs(
      identitySeed,
      displayName,
      imageUrl,
    ),
  });
  const showImage = Boolean(fallbackStyle.imageUrl);
  const badgeSizeClass =
    size === "sm" ? "size-2.5" : size === "md" ? "size-3" : "size-3.5";
  const initialsSizeClass =
    researcherAvatarInitialsSizeClasses[size] ?? researcherAvatarInitialsSizeClasses.sm;

  const avatarNode = (
    <Avatar size={size} className={className}>
      {showImage ? (
        <Avatar.Image
          alt={displayName?.trim() ?? "Researcher"}
          src={fallbackStyle.imageUrl ?? ""}
          className="rounded-full"
        />
      ) : null}
      <Avatar.Fallback
        className={cn(
          "inline-flex h-full w-full items-center justify-center rounded-full font-medium leading-none",
          initialsSizeClass,
          fallbackStyle.fallbackClassName,
        )}
      >
        {showIconFallback ? (
          <UserIcon className="size-3.5" aria-hidden />
        ) : initials.length > 0 ? (
          initials.slice(0, 2)
        ) : (
          "?"
        )}
      </Avatar.Fallback>
    </Avatar>
  );
  if (!attributionBadgeStatus) {
    return avatarNode;
  }
  return (
    <Badge.Anchor>
      {avatarNode}
      <Badge
        color={badgeColorForStatus(attributionBadgeStatus)}
        size="sm"
        placement="top-left"
        className={cn(
          badgeSizeClass,
          "min-h-0 min-w-0 rounded-full p-0",
        )}
      />
    </Badge.Anchor>
  );
}

export const CustomAvatar = ({
  user,
  size = "md",
  className,
  ...rest
}: CustomAvatarProps) => {
  const initials = displayInitialsFromName(user.name);
  const isAtlasProfile = user.isAtlasProfile ?? true;
  const showIconFallback = shouldUseAvatarIconFallback({
    isAtlasProfile,
    initials,
  });
  const fallbackStyle = resolveAvatarFallbackStyle({
    imageUrl: user.image,
    isAtlasProfile,
    hasIconFallback: showIconFallback,
    gradientSeed: avatarIdentitySeedFromInputs(user.orcid, user.id, user.name),
  });
  const showImage = Boolean(fallbackStyle.imageUrl);
  return (
    <Avatar size={size} className={className} {...rest}>
      {showImage ? (
        <Avatar.Image
          alt={user.name ?? "User"}
          src={fallbackStyle.imageUrl ?? ""}
          className="rounded-full"
        />
      ) : null}
      <Avatar.Fallback
        className={cn(
          "inline-flex h-full w-full items-center justify-center rounded-full text-xs font-medium leading-none",
          fallbackStyle.fallbackClassName,
        )}
      >
        {showIconFallback ? <UserIcon className="size-3.5" aria-hidden /> : initials.slice(0, 2)}
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
  pendingAttributionCount = 0,
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

  const menuTrigger = (
    <Button
      type="button"
      onClick={() => setIsOpen((open) => !open)}
      className="border-border bg-surface focus-visible:ring-accent hover:bg-default flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      aria-label={
        pendingAttributionCount > 0
          ? `User menu, ${pendingAttributionCount} pending dataset attributions`
          : "User menu"
      }
      aria-expanded={isOpen}
      aria-haspopup="true"
      aria-controls={isOpen ? menuId : undefined}
    >
      <CustomAvatar user={user} size="md" />
    </Button>
  );

  return (
    <div ref={menuContainerRef} className="relative">
      {pendingAttributionCount > 0 ? (
        <Badge.Anchor>
          {menuTrigger}
          <Badge color="danger" size="sm" placement="top-right">
            {String(pendingAttributionCount)}
          </Badge>
        </Badge.Anchor>
      ) : (
        menuTrigger
      )}

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
                <a
                  href={`https://orcid.org/${user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-accent flex items-center gap-1.5 text-xs transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ORCIDIcon className="h-3 w-3 shrink-0" authenticated />
                  <span className="tabular-nums">{user.id}</span>
                </a>
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
              onClick={() => handleAction("teams")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
            >
              <Users className="h-4 w-4" />
              Create team
            </button>
            <button
              type="button"
              onClick={() => handleAction("pending-attributions")}
              className="text-foreground hover:bg-default flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors"
              aria-label={
                pendingAttributionCount > 0
                  ? `Pending attributions, ${pendingAttributionCount} pending`
                  : "Pending attributions"
              }
            >
              {pendingAttributionCount > 0 ? (
                <Badge.Anchor>
                  <span className="inline-flex shrink-0">
                    <Bell className="h-4 w-4" aria-hidden />
                  </span>
                  <Badge color="danger" size="sm" placement="top-right">
                    {String(pendingAttributionCount)}
                  </Badge>
                </Badge.Anchor>
              ) : (
                <Bell className="h-4 w-4 shrink-0" aria-hidden />
              )}
              Pending attributions
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

import { trpc } from "~/trpc/client";

export function CustomUserButton() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const { data: pendingCountData } =
    trpc.datasetAttributions.countPendingForSession.useQuery(undefined, {
      enabled: Boolean(session?.user?.id),
      staleTime: 60_000,
    });

  const user = session?.user;

  if (!user) {
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
      case "teams":
        router.push("/account/teams");
        break;
      case "pending-attributions":
        router.push("/account/attributions/pending");
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
      pendingAttributionCount={pendingCountData?.count ?? 0}
    />
  );
}

interface AvatarGroupProps extends React.ComponentProps<typeof Avatar> {
  users?: UserWithOrcid[];
  max?: number;
  tooltipVariant?: AvatarTooltipVariant;
  tooltipMode?: AvatarTooltipMode;
  /** Renders as the last stacked slot inside the overlap row (e.g. add-researcher control). */
  trailingSlot?: React.ReactNode;
  wrapAvatarTrigger?: (params: {
    user: UserWithOrcid;
    index: number;
    avatar: React.ReactNode;
  }) => React.ReactNode;
}

export type AvatarTooltipVariant = "name" | "name-orcid";
export type AvatarTooltipMode = "individual" | "shared";

const avatarSizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
} as const;
const overflowCountTextSizeClasses = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-xs",
} as const;

const TOOLTIP_CLOSE_DELAY_MS = 100;
const TOOLTIP_VERTICAL_OFFSET_PX = 8;
const SHARED_TOOLTIP_MAX_ARROW_OFFSET_PX = 104;

function userDisplayName(user: UserWithOrcid): string {
  return user.name ?? "User";
}

function userOrcid(user: UserWithOrcid): string | null {
  const value = user.id?.trim();
  return value && value.length > 0 ? value : null;
}

function firstNonEmptyOrcidOrId(
  ...values: (string | null | undefined)[]
): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

function avatarGroupUserReactKey(user: UserWithOrcid, index: number): string {
  const stackKey = user.avatarStackKey?.trim();
  if (stackKey) {
    return stackKey;
  }
  const orcidOrId = firstNonEmptyOrcidOrId(user.orcid, user.id);
  if (orcidOrId) {
    return orcidOrId;
  }
  const name = user.name?.trim();
  if (name) {
    return name;
  }
  return `user-${index}`;
}

function AvatarIdentityTooltipContent({
  user,
  arrowOffsetPx = 0,
  showArrow = true,
  onMouseEnter,
  onMouseLeave,
}: {
  user: UserWithOrcid;
  arrowOffsetPx?: number;
  showArrow?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  const name = userDisplayName(user);
  const orcidValue = userOrcid(user);

  return (
    <div
      className="relative w-[min(15rem,calc(100vw-1rem))] rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-2.5 py-2 shadow-2xl backdrop-blur-sm"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {user.id ? (
          <Link
            href={`/users/${user.id}`}
            className="focus-visible:ring-accent block truncate rounded-sm text-sm font-semibold text-zinc-100 transition-colors hover:text-accent dark:hover:text-accent-light focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900"
            aria-label={`View ${name}'s profile`}
            title={name}
          >
            {name}
          </Link>
        ) : (
          <p className="truncate text-sm font-semibold text-zinc-100" title={name}>
            {name}
          </p>
        )}
        {user.tooltipSubtitle ? (
          <p className="text-zinc-400 truncate text-xs">{user.tooltipSubtitle}</p>
        ) : null}
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
            <span className="min-w-0 truncate">Not linked</span>
          </p>
        )}
      </div>
      {showArrow ? (
        <div
          className="absolute top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-700/80 bg-zinc-900/95 transition-[left] duration-150 ease-out"
          style={{ left: `calc(50% + ${arrowOffsetPx}px)` }}
        />
      ) : null}
    </div>
  );
}

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
  tooltipVariant: AvatarTooltipVariant;
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
      top: rect.top - TOOLTIP_VERTICAL_OFFSET_PX,
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
    }, TOOLTIP_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  const userName = userDisplayName(user);
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
              <AvatarIdentityTooltipContent
                user={user}
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleCloseTooltip}
              />
            ) : (
              <div className="bg-foreground text-background max-w-[15rem] rounded-2xl px-2.5 py-1.5 text-sm font-medium shadow-lg">
                <p className="truncate">{userName}</p>
                {user.tooltipSubtitle ? (
                  <p className="text-background/80 truncate text-xs font-normal">
                    {user.tooltipSubtitle}
                  </p>
                ) : null}
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
  const userName = userDisplayName(user);
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
  tooltipMode = "individual",
  trailingSlot,
  wrapAvatarTrigger,
}: AvatarGroupProps) {
  const sizeClass = avatarSizeClasses[size] ?? avatarSizeClasses.md;
  const overflowTextClass =
    overflowCountTextSizeClasses[size] ?? overflowCountTextSizeClasses.md;
  const constrainedClass = `${sizeClass} min-h-0 min-w-0 shrink-0`;
  const avatarWrapperClass = `bg-surface-1 relative z-0 flex shrink-0 overflow-hidden rounded-full shadow-sm hover:z-20 ${sizeClass}`;
  const researcherAvatarWrapperClass = `bg-surface-1 relative z-0 flex shrink-0 overflow-visible rounded-full shadow-sm hover:z-20 ${sizeClass}`;
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

  const useSharedTooltip = tooltipVariant === "name-orcid" && tooltipMode === "shared";
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
    const maxArrowOffset = SHARED_TOOLTIP_MAX_ARROW_OFFSET_PX;
    const rawOffset = triggerCenter - left;
    const arrowOffset = Math.max(-maxArrowOffset, Math.min(maxArrowOffset, rawOffset));
    setSharedTooltipPosition({
      left,
      top: triggerRect.top - TOOLTIP_VERTICAL_OFFSET_PX,
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
    }, TOOLTIP_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  useEffect(() => {
    if (!isSharedTooltipOpen || !useSharedTooltip) {
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
  }, [isSharedTooltipOpen, useSharedTooltip]);

  if (!users || users.length === 0) {
    return (
      <div className="flex items-center overflow-visible" role={trailingSlot ? "group" : undefined}>
        {trailingSlot ? null : (
          <span
            className={`bg-surface-1 relative z-0 flex overflow-hidden rounded-full shadow-sm ${sizeClass}`}
          >
            <CustomAvatar
              size={size}
              user={{ name: "?" }}
              className={constrainedClass}
            />
          </span>
        )}
        {trailingSlot ? (
          <span
            className={`relative z-30 inline-flex shrink-0 items-center justify-center ${sizeClass}`}
          >
            {trailingSlot}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div
        ref={groupRef}
        className="flex items-center overflow-visible"
        role="group"
        onMouseEnter={clearCloseTimer}
        onMouseLeave={scheduleSharedTooltipClose}
      >
        <div className="flex items-center -space-x-2.5 overflow-visible">
          {displayUsers.map((user, index) => {
          const userKey = avatarGroupUserReactKey(user, index);
          if (wrapAvatarTrigger) {
            return (
              <span
                key={userKey}
                className={`inline-flex shrink-0 items-center justify-center ${sizeClass}`}
              >
                {wrapAvatarTrigger({
                  user,
                  index,
                  avatar: (
                    <span className={researcherAvatarWrapperClass}>
                      <ResearcherAvatar
                        displayName={user.name}
                        imageUrl={user.image}
                        identitySeed={firstNonEmptyOrcidOrId(
                          user.orcid,
                          user.id,
                          user.avatarStackKey,
                          user.name,
                        )}
                        isAtlasProfile={
                          user.isAtlasProfile ?? Boolean(user.id?.trim())
                        }
                        attributionBadgeStatus={user.attributionBadgeStatus}
                        size={size}
                        className={constrainedClass}
                      />
                    </span>
                  ),
                })}
              </span>
            );
          }
            return useSharedTooltip ? (
              <AvatarTrigger
                key={userKey}
                user={user}
                avatarWrapperClass={avatarWrapperClass}
                constrainedClass={constrainedClass}
                size={size}
                onActivate={openSharedTooltip}
                onDeactivate={scheduleSharedTooltipClose}
              />
            ) : (
              <AvatarWithTooltip
                key={userKey}
                user={user}
                avatarWrapperClass={avatarWrapperClass}
                constrainedClass={constrainedClass}
                size={size}
                tooltipVariant={tooltipVariant}
              />
            );
          })}
          {remaining > 0 ? (
            <span
              className={`bg-surface-2 text-text-primary relative z-10 flex shrink-0 items-center justify-center rounded-full font-bold shadow-sm ${sizeClass} ${overflowTextClass}`}
              title={`${remaining} more`}
            >
              +{remaining}
            </span>
          ) : null}
        </div>
        {trailingSlot ? (
          <span
            className={`relative z-30 ml-1 inline-flex shrink-0 items-center justify-center ${sizeClass}`}
          >
            {trailingSlot}
          </span>
        ) : null}
      </div>
      {useSharedTooltip && isSharedTooltipOpen && activeUser && typeof document !== "undefined"
        ? createPortal(
            <div
              className="z-tooltip pointer-events-auto fixed -translate-x-1/2 -translate-y-full"
              style={{
                left: sharedTooltipPosition.left,
                top: sharedTooltipPosition.top,
              }}
            >
              <AvatarIdentityTooltipContent
                user={activeUser}
                arrowOffsetPx={sharedTooltipPosition.arrowOffset}
                onMouseEnter={clearCloseTimer}
                onMouseLeave={scheduleSharedTooltipClose}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
