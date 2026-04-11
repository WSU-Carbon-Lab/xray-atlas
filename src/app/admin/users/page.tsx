"use client";

import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useId,
} from "react";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Button,
  Table,
  Input,
  Label,
  Checkbox,
  Chip,
  Card,
  Kbd,
  SearchField,
  Separator,
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { ChevronUp, Copy, Eye, Pencil, Trash2, X } from "lucide-react";
import { trpc } from "~/trpc/client";
import { CustomAvatar } from "~/components/ui/avatar";
import { ORCIDIcon } from "~/components/icons";
import { SimpleDialog } from "~/components/ui/dialog";
import { HexColorSelector } from "~/components/ui/hex-color-selector";
import { showToast } from "~/components/ui/toast";
import {
  APP_LINEAGE_ROLE_SLUGS,
  isLineageRoleSlug,
} from "~/lib/app-role-lineage";
import {
  APP_PERMISSION_GROUPS,
  type AppPermissionKey,
  parseRolePermissions,
} from "~/lib/app-role-permissions";
import {
  DEFAULT_ROLE_COLOR,
  ROLE_COLOR_PRESETS,
  roleHexColorSchema,
} from "~/lib/app-role-colors";
import { normalizeRoleSlugInput } from "~/lib/app-role-slug";

const PAGE_SIZE = 20;

function RoleFaviconUrlPreview({
  imageUrl,
  onClear,
}: {
  imageUrl: string;
  onClear: () => void;
}) {
  const t = imageUrl.trim();
  if (!t) return null;
  return (
    <div className="relative mt-2 inline-block">
      <img
        key={t}
        src={t}
        alt=""
        className="border-border size-10 rounded-lg border object-cover"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <Button
        isIconOnly
        size="sm"
        variant="secondary"
        aria-label="Remove favicon and clear URL"
        className="border-border bg-surface text-foreground absolute -top-1 -right-1 z-[1] size-6 min-w-6 rounded-full border shadow-md"
        onPress={onClear}
      >
        <X className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}

function AdminQueryError({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="border-danger/25 bg-danger/5 rounded-xl border p-4">
      <p className="text-danger text-sm font-semibold">{title}</p>
      <p className="text-muted mt-2 text-xs leading-relaxed wrap-break-word">
        {message}
      </p>
      <p className="text-muted mt-2 text-xs leading-relaxed">
        If you recently changed auth roles in the schema, run migrations for the
        database used by this app&apos;s{" "}
        <code className="text-foreground/90 bg-surface-2/80 rounded px-1 py-0.5 text-[0.7rem]">
          DATABASE_URL
        </code>{" "}
        (local and Supabase MCP targets can differ).
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3"
        onPress={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  orcid: string | null;
  userAppRoles: {
    role: {
      id: string;
      displayName: string;
      slug: string;
      color: string;
      faviconUrl: string | null;
      isSystem: boolean;
    };
  }[];
}

type UserSortColumn = "member" | "orcid" | "roles";

const ADMIN_ROLE_TABLE_CHIP_CLASS = "border-l-[3px] max-w-[11rem]";

function lineageRoleSortRank(slugs: readonly string[]): number {
  const set = new Set(slugs);
  const idx = APP_LINEAGE_ROLE_SLUGS.findIndex((slug) => set.has(slug));
  return idx === -1 ? APP_LINEAGE_ROLE_SLUGS.length : idx;
}

function AdminRoleChipContent({
  displayName,
  faviconUrl,
}: {
  displayName: string;
  faviconUrl: string | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="size-3 shrink-0 rounded-sm object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="truncate">{displayName}</span>
    </span>
  );
}

interface AdminDirectoryRoleChip {
  readonly id: string;
  readonly displayName: string;
  readonly faviconUrl: string | null;
  readonly color: string;
}

function AdminRolesDirectoryList({
  roles,
  onEditRole,
  ariaLabel,
}: {
  roles: readonly AdminDirectoryRoleChip[];
  onEditRole: (roleId: string) => void;
  ariaLabel: string;
}) {
  return (
    <ul
      className="m-0 flex list-none flex-wrap gap-1 p-0"
      aria-label={ariaLabel}
    >
      {roles.map((role) => (
        <li key={role.id}>
          <button
            type="button"
            onClick={() => onEditRole(role.id)}
            className="focus-visible:ring-accent/50 rounded-md p-0 focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Edit role ${role.displayName}`}
          >
            <Chip
              size="sm"
              variant="soft"
              className={cn(ADMIN_ROLE_TABLE_CHIP_CLASS, "pointer-events-none")}
              style={{ borderLeftColor: role.color }}
            >
              <span className="flex min-w-0 items-center gap-1">
                <AdminRoleChipContent
                  displayName={role.displayName}
                  faviconUrl={role.faviconUrl}
                />
                <Pencil
                  className="text-muted size-3 shrink-0 opacity-70"
                  aria-hidden
                />
              </span>
            </Chip>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RolePermissionEditor({
  selected,
  onToggle,
  disabled,
}: {
  selected: Set<AppPermissionKey>;
  onToggle: (key: AppPermissionKey) => void;
  disabled?: boolean;
}) {
  const reactId = useId();
  return (
    <div className="flex flex-col gap-4">
      {APP_PERMISSION_GROUPS.map((group) => (
        <div
          key={group.id}
          className="border-border bg-surface-2/20 rounded-xl border p-3"
        >
          <p className="text-foreground text-sm font-semibold">{group.title}</p>
          <p className="text-muted mt-0.5 mb-2 text-xs leading-relaxed">
            {group.description}
          </p>
          <div className="flex flex-col gap-3">
            {group.items.map((item) => {
              const fieldId = `${reactId}-${group.id}-${item.key}`;
              return (
                <Checkbox
                  key={item.key}
                  id={fieldId}
                  variant="secondary"
                  className="items-start gap-3"
                  isSelected={selected.has(item.key)}
                  isDisabled={disabled}
                  onChange={() => onToggle(item.key)}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label
                      htmlFor={fieldId}
                      className="text-foreground cursor-pointer text-sm font-normal leading-snug"
                    >
                      {item.label}
                    </Label>
                  </Checkbox.Content>
                </Checkbox>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SortableColumnHeader({
  label,
  active,
  direction,
  onPress,
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      className="text-muted hover:text-foreground flex w-full min-w-0 items-center justify-between gap-2 text-left text-xs font-semibold uppercase tracking-wide"
      onClick={onPress}
    >
      <span className="truncate">{label}</span>
      {active ? (
        <ChevronUp
          className={cn(
            "text-muted size-3.5 shrink-0 transition-transform",
            direction === "desc" && "rotate-180",
          )}
          aria-hidden
        />
      ) : (
        <span className="size-3.5 shrink-0" aria-hidden />
      )}
    </button>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const selfId = session?.user?.id ?? null;

  const [skip, setSkip] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQ, setSearchQ] = useState<string | undefined>(undefined);

  const [editUserTarget, setEditUserTarget] = useState<{
    id: string;
    name: string | null;
    email: string | null;
    orcid: string | null;
    userAppRoles: {
      role: {
        id: string;
        displayName: string;
        slug: string;
        color: string;
        faviconUrl: string | null;
        isSystem: boolean;
      };
    }[];
  } | null>(null);
  const [editUserDisplayName, setEditUserDisplayName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserOrcid, setEditUserOrcid] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleSlug, setNewRoleSlug] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleColor, setNewRoleColor] = useState(DEFAULT_ROLE_COLOR);
  const [newRoleFaviconUrl, setNewRoleFaviconUrl] = useState("");
  const [newRoleEmailable, setNewRoleEmailable] = useState(false);
  const [newRolePermissions, setNewRolePermissions] = useState<
    Set<AppPermissionKey>
  >(() => new Set());

  const newRoleSlugAutoSyncRef = useRef(true);
  const prevCreateRoleOpenRef = useRef(false);

  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRoleColor, setEditRoleColor] = useState(DEFAULT_ROLE_COLOR);
  const [editRoleFaviconUrl, setEditRoleFaviconUrl] = useState("");
  const [editRoleEmailable, setEditRoleEmailable] = useState(false);
  const [editRolePermissions, setEditRolePermissions] = useState<
    Set<AppPermissionKey>
  >(() => new Set());

  const [userSort, setUserSort] = useState<{
    column: UserSortColumn;
    direction: "asc" | "desc";
  }>({ column: "roles", direction: "asc" });

  const searchInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const listUsers = trpc.admin.listUsers.useQuery(
    { skip, take: PAGE_SIZE, q: searchQ },
    { staleTime: 30_000 },
  );
  const listRoles = trpc.admin.listRoles.useQuery(undefined, {
    staleTime: 60_000,
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      showToast("User updated.", "success");
      setEditUserTarget(null);
      await utils.admin.listUsers.invalidate();
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      showToast("User removed.", "success");
      setDeleteUserId(null);
      await utils.admin.listUsers.invalidate();
    },
    onError: (e) => showToast(e.message, "error"),
  });

  useEffect(() => {
    const nowOpen = createRoleOpen;
    const wasOpen = prevCreateRoleOpenRef.current;
    prevCreateRoleOpenRef.current = nowOpen;
    if (nowOpen && !wasOpen) {
      newRoleSlugAutoSyncRef.current = true;
      setNewRoleSlug(normalizeRoleSlugInput(newRoleName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `newRoleName` is read only when the dialog opens; live name typing syncs in the name field handler
  }, [createRoleOpen]);

  const createRole = trpc.admin.createRole.useMutation({
    onSuccess: async () => {
      showToast("Role created.", "success");
      setCreateRoleOpen(false);
      setNewRoleName("");
      setNewRoleSlug("");
      newRoleSlugAutoSyncRef.current = true;
      setNewRoleDescription("");
      setNewRoleColor(DEFAULT_ROLE_COLOR);
      setNewRoleFaviconUrl("");
      setNewRoleEmailable(false);
      setNewRolePermissions(new Set());
      await utils.admin.listRoles.invalidate();
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const updateRole = trpc.admin.updateRole.useMutation({
    onSuccess: async () => {
      showToast("Role updated.", "success");
      setEditRoleId(null);
      await utils.admin.listRoles.invalidate();
      await utils.admin.listUsers.invalidate();
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const deleteRole = trpc.admin.deleteRole.useMutation({
    onSuccess: async () => {
      showToast("Role deleted.", "success");
      await utils.admin.listRoles.invalidate();
    },
    onError: (e) => showToast(e.message, "error"),
  });

  useEffect(() => {
    if (!editUserTarget) {
      setSelectedRoleIds(new Set());
      return;
    }
    setSelectedRoleIds(
      new Set(editUserTarget.userAppRoles.map((ur) => ur.role.id)),
    );
    setEditUserDisplayName(editUserTarget.name ?? "");
    setEditUserEmail(editUserTarget.email ?? "");
    setEditUserOrcid(editUserTarget.orcid ?? "");
  }, [editUserTarget]);

  const toggleRoleSelection = useCallback(
    (roleId: string, roleSlug: string) => {
      setSelectedRoleIds((prev) => {
        const next = new Set(prev);
        if (next.has(roleId)) {
          next.delete(roleId);
          return next;
        }
        if (isLineageRoleSlug(roleSlug)) {
          for (const r of listRoles.data ?? []) {
            if (isLineageRoleSlug(r.slug)) {
              next.delete(r.id);
            }
          }
        }
        next.add(roleId);
        return next;
      });
    },
    [listRoles.data],
  );

  const editingRole = useMemo(() => {
    if (!editRoleId || !listRoles.data) return null;
    return listRoles.data.find((r) => r.id === editRoleId) ?? null;
  }, [editRoleId, listRoles.data]);

  useEffect(() => {
    if (!editingRole) {
      return;
    }
    setEditRoleName(editingRole.displayName);
    setEditRoleDescription(editingRole.description ?? "");
    setEditRoleColor(editingRole.color);
    setEditRoleFaviconUrl(editingRole.faviconUrl ?? "");
    setEditRoleEmailable(editingRole.isEmailable);
    setEditRolePermissions(
      new Set(parseRolePermissions(editingRole.permissions)),
    );
  }, [editingRole]);

  const skipNewFaviconColorSampleRef = useRef(false);
  useEffect(() => {
    if (createRoleOpen) {
      skipNewFaviconColorSampleRef.current = true;
    }
  }, [createRoleOpen]);

  useEffect(() => {
    if (!createRoleOpen) return;
    if (skipNewFaviconColorSampleRef.current) {
      skipNewFaviconColorSampleRef.current = false;
      return;
    }
    const t = newRoleFaviconUrl.trim();
    if (!t || !z.string().url().safeParse(t).success) return;
    const handle = setTimeout(() => {
      void utils.admin.sampleIconPrimaryHex.fetch({ url: t }).then((d) => {
        if (d.hex) setNewRoleColor(d.hex);
      });
    }, 480);
    return () => clearTimeout(handle);
  }, [createRoleOpen, newRoleFaviconUrl, utils]);

  const skipEditFaviconColorSampleRef = useRef(false);
  useEffect(() => {
    if (editRoleId) {
      skipEditFaviconColorSampleRef.current = true;
    }
  }, [editRoleId]);

  useEffect(() => {
    if (!editRoleId || !editingRole) return;
    if (skipEditFaviconColorSampleRef.current) {
      skipEditFaviconColorSampleRef.current = false;
      return;
    }
    const t = editRoleFaviconUrl.trim();
    const hydrated = (editingRole.faviconUrl ?? "").trim();
    if (t === hydrated) return;
    if (!t || !z.string().url().safeParse(t).success) return;
    const handle = setTimeout(() => {
      void utils.admin.sampleIconPrimaryHex.fetch({ url: t }).then((d) => {
        if (d.hex) setEditRoleColor(d.hex);
      });
    }, 480);
    return () => clearTimeout(handle);
  }, [editRoleFaviconUrl, editRoleId, editingRole, utils]);

  const toggleNewPermission = useCallback((key: AppPermissionKey) => {
    setNewRolePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleEditPermission = useCallback((key: AppPermissionKey) => {
    setEditRolePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const totalPages = Math.max(
    1,
    Math.ceil((listUsers.data?.total ?? 0) / PAGE_SIZE),
  );
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;

  const openEditRole = (id: string) => {
    setEditRoleId(id);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchDraft.trim();
      setSearchQ(trimmed.length > 0 ? trimmed : undefined);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    setSkip(0);
  }, [searchQ]);

  const flushUserSearch = useCallback(() => {
    const trimmed = searchDraft.trim();
    setSearchQ(trimmed.length > 0 ? trimmed : undefined);
  }, [searchDraft]);

  const copyUserId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast("User id copied.", "success");
    } catch {
      showToast("Could not copy id.", "error");
    }
  }, []);

  const toggleUserSort = useCallback((column: UserSortColumn) => {
    setUserSort((prev) =>
      prev.column === column
        ? { column, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    );
  }, []);

  const sortedUserRows = useMemo(() => {
    const rows = listUsers.data?.rows ?? [];
    const { column, direction } = userSort;
    const mul = direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (column) {
        case "member": {
          const an = (a.name ?? a.email ?? "").toLocaleLowerCase();
          const bn = (b.name ?? b.email ?? "").toLocaleLowerCase();
          cmp = an.localeCompare(bn);
          break;
        }
        case "orcid":
          cmp = (a.orcid ?? "").localeCompare(b.orcid ?? "");
          break;
        case "roles": {
          const slugsA = a.userAppRoles.map((x) => x.role.slug);
          const slugsB = b.userAppRoles.map((x) => x.role.slug);
          cmp = lineageRoleSortRank(slugsA) - lineageRoleSortRank(slugsB);
          if (cmp !== 0) break;
          const ar = [...a.userAppRoles.map((x) => x.role.displayName)]
            .sort()
            .join(", ");
          const br = [...b.userAppRoles.map((x) => x.role.displayName)]
            .sort()
            .join(", ");
          cmp = ar.localeCompare(br);
          if (cmp !== 0) break;
          const an = (a.name ?? a.email ?? "").toLocaleLowerCase();
          const bn = (b.name ?? b.email ?? "").toLocaleLowerCase();
          cmp = an.localeCompare(bn);
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * mul;
    });
  }, [listUsers.data?.rows, userSort]);

  const { systemRoles, customRoles } = useMemo(() => {
    const data = listRoles.data ?? [];
    const system = data
      .filter((r) => r.isSystem)
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const custom = data
      .filter((r) => !r.isSystem)
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { systemRoles: system, customRoles: custom };
  }, [listRoles.data]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key.toLowerCase() !== "k") return;
      if (!e.metaKey && !e.ctrlKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        if (active !== searchInputRef.current) return;
      }
      e.preventDefault();
      const el = searchInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12">
      <header className="border-border bg-surface-1 mb-8 rounded-2xl border px-6 py-6 shadow-sm sm:px-8">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          User administration
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-relaxed">
          Edit display name, email, ORCID, and roles; manage custom roles; remove
          accounts. At most one of Administrator, Maintainer, or Contributor per
          user, plus any custom roles. Changes apply on the next request or session
          refresh where relevant.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <Card className="border-border bg-surface-1 order-1 overflow-hidden border shadow-sm lg:order-none lg:col-span-4 xl:col-span-4">
          <Card.Header className="border-border flex flex-row flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0 flex-1 pr-2">
              <Card.Title className="text-foreground text-base font-semibold">
                Roles
              </Card.Title>
              <Card.Description className="text-muted mt-1 text-xs leading-relaxed">
                Lowercase labels, colors, optional favicons, and grouped
                permissions. Emailable is reserved for future team email.
              </Card.Description>
            </div>
            <Button
              size="sm"
              variant="primary"
              className="shrink-0"
              onPress={() => setCreateRoleOpen(true)}
            >
              Create role
            </Button>
          </Card.Header>
          <Card.Content className="bg-surface-2/10 px-5 py-5">
            {listRoles.isLoading ? (
              <p className="text-muted text-sm">Loading roles…</p>
            ) : listRoles.isError ? (
              <AdminQueryError
                title="Could not load roles"
                message={listRoles.error.message}
                onRetry={() => void listRoles.refetch()}
              />
            ) : (listRoles.data?.length ?? 0) === 0 ? (
              <p className="text-muted text-sm">No roles defined.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {systemRoles.length > 0 ? (
                  <section aria-labelledby="admin-directory-system-roles">
                    <h3
                      id="admin-directory-system-roles"
                      className="text-muted mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    >
                      System roles
                    </h3>
                    <AdminRolesDirectoryList
                      roles={systemRoles}
                      onEditRole={openEditRole}
                      ariaLabel="System application roles"
                    />
                  </section>
                ) : null}
                {systemRoles.length > 0 && customRoles.length > 0 ? (
                  <Separator
                    orientation="horizontal"
                    className="bg-border my-0 w-full shrink-0"
                  />
                ) : null}
                {customRoles.length > 0 ? (
                  <section aria-labelledby="admin-directory-custom-roles">
                    <h3
                      id="admin-directory-custom-roles"
                      className="text-muted mb-2 text-[11px] font-semibold tracking-wide uppercase"
                    >
                      Custom roles
                    </h3>
                    <AdminRolesDirectoryList
                      roles={customRoles}
                      onEditRole={openEditRole}
                      ariaLabel="Custom application roles"
                    />
                  </section>
                ) : null}
              </div>
            )}
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface-1 order-2 overflow-hidden border shadow-sm lg:order-none lg:col-span-8 xl:col-span-8">
          <Card.Header className="border-border border-b px-5 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="min-w-0 lg:max-w-sm">
                <Card.Title className="text-foreground text-base font-semibold">
                  Users
                </Card.Title>
                <Card.Description className="text-muted mt-1 text-sm">
                  Search the directory, open profiles, edit account fields and
                  roles, or remove accounts.
                </Card.Description>
              </div>
              <div className="min-w-0 w-full lg:max-w-2xl lg:flex-1">
                <SearchField
                  name="admin-user-search"
                  value={searchDraft}
                  onChange={setSearchDraft}
                  variant="secondary"
                  className="w-full"
                >
                  <SearchField.Group className="border-border bg-surface text-foreground flex h-12 min-h-12 w-full flex-row items-center gap-3 rounded-2xl border px-4 shadow-sm">
                    <SearchField.SearchIcon className="text-muted h-5 w-5 shrink-0" />
                    <SearchField.Input
                      ref={searchInputRef}
                      placeholder="Search users by name, email, or ORCID…"
                      className="placeholder:text-muted min-w-0 flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none"
                      aria-label="Search users by name, email, or ORCID"
                      aria-keyshortcuts="Meta+K Ctrl+K"
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          flushUserSearch();
                        }
                      }}
                    />
                    {searchDraft ? (
                      <SearchField.ClearButton
                        aria-label="Clear user search"
                        className="text-muted h-7 w-7 shrink-0 rounded-md p-0.5"
                      />
                    ) : (
                      <Kbd
                        className="border-border-strong bg-default text-foreground shrink-0 gap-0.5 rounded-md border px-2 py-1 font-sans text-[11px] font-medium tabular-nums shadow-sm"
                        aria-hidden
                      >
                        <Kbd.Abbr keyValue="command" />
                        <Kbd.Content>K</Kbd.Content>
                      </Kbd>
                    )}
                  </SearchField.Group>
                </SearchField>
              </div>
            </div>
          </Card.Header>
          <Card.Content className="bg-surface-2/15 p-0">
            {listUsers.isError ? (
              <div className="p-5">
                <AdminQueryError
                  title="Could not load users"
                  message={listUsers.error.message}
                  onRetry={() => void listUsers.refetch()}
                />
              </div>
            ) : (
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Users"
                className="table-fixed w-full min-w-[36rem] md:min-w-[40rem]"
              >
                <Table.Header>
                  <Table.Column
                    id="member"
                    className="min-w-[12rem] max-w-[20rem] px-3 py-2 align-middle [&:first-child]:pl-4"
                    isRowHeader
                  >
                    <SortableColumnHeader
                      label="Member"
                      active={userSort.column === "member"}
                      direction={userSort.direction}
                      onPress={() => toggleUserSort("member")}
                    />
                  </Table.Column>
                  <Table.Column
                    id="orcid"
                    className="min-w-[9.5rem] max-w-[14rem] px-2 py-2 align-middle"
                  >
                    <SortableColumnHeader
                      label="ORCID"
                      active={userSort.column === "orcid"}
                      direction={userSort.direction}
                      onPress={() => toggleUserSort("orcid")}
                    />
                  </Table.Column>
                  <Table.Column
                    id="roles"
                    className="min-w-[10rem] px-2 py-2 align-middle"
                  >
                    <SortableColumnHeader
                      label="Roles"
                      active={userSort.column === "roles"}
                      direction={userSort.direction}
                      onPress={() => toggleUserSort("roles")}
                    />
                  </Table.Column>
                  <Table.Column className="w-[6.75rem] min-w-[6.75rem] max-w-[6.75rem] px-2 py-2 text-end align-middle [&:last-child]:pr-4">
                    <span className="text-muted block text-xs font-semibold uppercase tracking-wide">
                      Actions
                    </span>
                  </Table.Column>
                </Table.Header>
                <Table.Body items={sortedUserRows}>
                  {(u: AdminUserRow) => {
                    const isSelf = selfId === u.id;
                    return (
                      <Table.Row id={u.id}>
                        <Table.Cell className="align-middle px-3 py-2.5 [&:first-child]:pl-4">
                          <div className="flex items-center gap-3">
                            <CustomAvatar
                              user={{
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                image: u.image,
                              }}
                              size="sm"
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex min-w-0 items-center gap-1">
                                <span className="text-foreground truncate text-sm font-medium">
                                  {u.name ?? "No name"}
                                </span>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted size-8 shrink-0"
                                  aria-label={`Copy user id for ${u.name ?? u.email ?? "user"}`}
                                  onPress={() => void copyUserId(u.id)}
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                              </div>
                              <span className="text-muted truncate text-xs">
                                {u.email ?? "—"}
                              </span>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="align-middle px-2 py-2.5">
                          {u.orcid ? (
                            <a
                              href={`https://orcid.org/${u.orcid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-accent inline-flex max-w-full items-center gap-1.5 text-xs transition-colors"
                            >
                              <ORCIDIcon
                                className="size-3.5 shrink-0"
                                authenticated
                              />
                              <span className="tabular-nums">{u.orcid}</span>
                            </a>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </Table.Cell>
                        <Table.Cell className="align-middle px-2 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {u.userAppRoles.map((ur) => (
                              <Chip
                                key={ur.role.id}
                                size="sm"
                                variant="soft"
                                className={ADMIN_ROLE_TABLE_CHIP_CLASS}
                                style={{
                                  borderLeftColor: ur.role.color,
                                }}
                              >
                                <AdminRoleChipContent
                                  displayName={ur.role.displayName}
                                  faviconUrl={ur.role.faviconUrl}
                                />
                              </Chip>
                            ))}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="align-middle px-2 py-2.5 pr-4">
                          <div
                            role="group"
                            aria-label={`Actions for ${u.name ?? u.email ?? "user"}`}
                            className="ml-auto grid w-[6.25rem] grid-cols-3 place-items-center gap-0"
                          >
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label={`Open profile for ${u.name ?? u.email ?? "user"}`}
                              className="text-foreground size-9 min-h-9 min-w-9"
                              onPress={() => router.push(`/users/${u.id}`)}
                            >
                              <Eye className="size-4 shrink-0" />
                            </Button>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              aria-label={`Edit user ${u.name ?? u.email ?? ""}`}
                              className="text-foreground size-9 min-h-9 min-w-9"
                              onPress={() =>
                                setEditUserTarget({
                                  id: u.id,
                                  name: u.name,
                                  email: u.email,
                                  orcid: u.orcid,
                                  userAppRoles: u.userAppRoles,
                                })
                              }
                            >
                              <Pencil className="size-4 shrink-0" />
                            </Button>
                            <div
                              className={cn(
                                "flex size-9 items-center justify-center",
                                isSelf &&
                                  "rounded-lg bg-default/45 ring-border/60 ring-1 ring-inset",
                              )}
                              title={
                                isSelf
                                  ? "You cannot delete your own account from the admin console."
                                  : undefined
                              }
                            >
                              <Button
                                isIconOnly
                                size="sm"
                                variant="ghost"
                                isDisabled={isSelf}
                                aria-label={
                                  isSelf
                                    ? "Delete unavailable for your own account"
                                    : `Delete ${u.name ?? u.email ?? "user"}`
                                }
                                className={cn(
                                  "size-9 min-h-9 min-w-9",
                                  isSelf
                                    ? "text-muted cursor-not-allowed opacity-45"
                                    : "text-danger hover:bg-danger/10",
                                )}
                                onPress={() => {
                                  if (!isSelf) setDeleteUserId(u.id);
                                }}
                              >
                                <Trash2
                                  className={cn(
                                    "size-4 shrink-0",
                                    isSelf && "stroke-[1.25]",
                                  )}
                                />
                              </Button>
                            </div>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    );
                  }}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
            )}
          </Card.Content>
          <Card.Footer className="border-border bg-surface-1 text-muted flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm">
            {listUsers.isError ? (
              <span className="text-danger text-sm font-medium">
                User list unavailable until the request succeeds.
              </span>
            ) : (
            <span>
              Page {currentPage} of {totalPages} (
              {listUsers.data?.total ?? 0} users)
            </span>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                isDisabled={skip <= 0 || listUsers.isError}
                onPress={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={
                  listUsers.isError ||
                  !listUsers.data ||
                  skip + PAGE_SIZE >= listUsers.data.total
                }
                onPress={() => setSkip((s) => s + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>
          </Card.Footer>
        </Card>
      </div>

      <SimpleDialog
        isOpen={Boolean(editUserTarget)}
        onClose={() => setEditUserTarget(null)}
        title={
          editUserTarget
            ? `Edit ${editUserTarget.name ?? editUserTarget.email ?? "user"}`
            : "Edit user"
        }
        maxWidth="max-w-xl"
      >
        {editUserTarget && listRoles.data ? (
          <div className="flex min-w-0 flex-col gap-4">
            <div className="min-w-0">
              <Label htmlFor="admin-edit-display-name">Display name</Label>
              <p className="text-muted mt-1 mb-2 text-xs leading-relaxed wrap-break-word">
                Shown in the app and directory listings.
              </p>
              <Input
                id="admin-edit-display-name"
                value={editUserDisplayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditUserDisplayName(e.target.value)
                }
                placeholder="Display name"
                className="mt-0 w-full min-w-0"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="admin-edit-email">Email</Label>
              <p className="text-muted mt-1 mb-2 text-xs leading-relaxed wrap-break-word">
                Directory contact email for profiles and search. This is not
                authentication: sign-in uses linked accounts (for example OAuth
                or passkeys). Leave empty to clear. Must be unique in the
                database if set.
              </p>
              <Input
                id="admin-edit-email"
                type="email"
                value={editUserEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditUserEmail(e.target.value)
                }
                placeholder="name@institution.org"
                className="mt-0 w-full min-w-0"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="admin-edit-orcid">ORCID</Label>
              <p className="text-muted mt-1 mb-2 text-xs leading-relaxed wrap-break-word">
                Leave empty to clear. Format is validated on save.
              </p>
              <Input
                id="admin-edit-orcid"
                value={editUserOrcid}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditUserOrcid(e.target.value)
                }
                placeholder="0000-0001-2345-6789"
                className="mt-0 w-full min-w-0"
              />
            </div>
            <div className="border-border border-t pt-2">
              <p className="text-foreground mb-2 text-sm font-medium">Roles</p>
              <p className="text-muted mb-2 text-sm">
                Pick any custom roles. Only one of Administrator, Maintainer, or
                Contributor can be selected; choosing another replaces the current
                one. At least one role is required.
              </p>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                {listRoles.data.map((role) => {
                  const rid = `admin-edit-user-role-${role.id}`;
                  return (
                    <Checkbox
                      key={role.id}
                      id={rid}
                      className="items-start gap-3"
                      isSelected={selectedRoleIds.has(role.id)}
                      onChange={() => toggleRoleSelection(role.id, role.slug)}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Content>
                        <Label
                          htmlFor={rid}
                          className="text-foreground cursor-pointer text-sm font-normal"
                        >
                          {role.displayName}{" "}
                          <span className="text-muted">({role.slug})</span>
                        </Label>
                      </Checkbox.Content>
                    </Checkbox>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onPress={() => setEditUserTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={
                  selectedRoleIds.size === 0 || updateUser.isPending
                }
                onPress={() => {
                  if (!editUserTarget || selectedRoleIds.size === 0) return;
                  const emailTrim = editUserEmail.trim();
                  const emailPayload =
                    emailTrim === "" ? ("" as const) : emailTrim;
                  if (
                    emailPayload !== "" &&
                    !z.string().email().safeParse(emailPayload).success
                  ) {
                    showToast(
                      "Enter a valid email or leave the field empty.",
                      "error",
                    );
                    return;
                  }
                  updateUser.mutate({
                    userId: editUserTarget.id,
                    name: editUserDisplayName,
                    email: emailPayload,
                    orcid: editUserOrcid,
                    roleIds: Array.from(selectedRoleIds),
                  });
                }}
              >
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </SimpleDialog>

      <SimpleDialog
        isOpen={Boolean(deleteUserId)}
        onClose={() => setDeleteUserId(null)}
        title="Delete user"
      >
        <p className="text-muted text-sm">
          This removes the account and content they created (experiments and
          molecules they authored), the same as self-service account deletion.
          Their favorites are removed with the account; anonymous molecule-view
          rows are kept without a user id. Engagement and favorite-related metrics
          may no longer match historical totals. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onPress={() => setDeleteUserId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isDisabled={deleteUser.isPending}
            onPress={() => {
              if (deleteUserId) deleteUser.mutate({ userId: deleteUserId });
            }}
          >
            Delete user
          </Button>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={createRoleOpen}
        onClose={() => setCreateRoleOpen(false)}
        title="Create role"
        maxWidth="max-w-2xl"
      >
        <div className="flex min-w-0 flex-col gap-4 pr-1">
          <div className="min-w-0">
            <Label htmlFor="new-role-name">Name</Label>
            <p className="text-muted mt-1 mb-2 text-xs leading-relaxed">
              Stored as entered for display. Slug auto-fills from the name
              (lowercase; spaces, hyphens, and slashes become underscores) and
              stays editable—for example{" "}
              <code className="text-foreground/90">WSU Carbon Lab</code> becomes{" "}
              <code className="text-foreground/90">wsu_carbon_lab</code>.
            </p>
            <Input
              id="new-role-name"
              value={newRoleName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = e.target.value;
                setNewRoleName(v);
                if (newRoleSlugAutoSyncRef.current) {
                  setNewRoleSlug(normalizeRoleSlugInput(v));
                }
              }}
              placeholder="WSU Carbon Lab"
              className="w-full min-w-0"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="new-role-slug">Slug (optional)</Label>
            <p className="text-muted mt-1 mb-2 text-xs leading-relaxed">
              Fills from the name until you edit here; typing applies the same
              normalization.
            </p>
            <Input
              id="new-role-slug"
              value={newRoleSlug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                newRoleSlugAutoSyncRef.current = false;
                setNewRoleSlug(normalizeRoleSlugInput(e.target.value));
              }}
              placeholder="wsu_carbon_lab"
              className="w-full min-w-0 font-mono text-xs"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="new-role-desc">Description</Label>
            <textarea
              id="new-role-desc"
              value={newRoleDescription}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewRoleDescription(e.target.value)
              }
              rows={3}
              className="border-border bg-surface text-foreground mt-1 w-full min-w-0 resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="new-role-favicon">Favicon URL</Label>
            <p className="text-muted mt-1 mb-2 text-xs leading-relaxed">
              External image URL (for example a site favicon). Shown beside the
              role in lists. After a valid URL is entered, the server samples the
              image and sets the role accent color automatically (you can still
              change it below).
            </p>
            <Input
              id="new-role-favicon"
              value={newRoleFaviconUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewRoleFaviconUrl(e.target.value)
              }
              placeholder="https://example.com/favicon.ico"
              className="w-full min-w-0"
            />
            <RoleFaviconUrlPreview
              imageUrl={newRoleFaviconUrl}
              onClear={() => setNewRoleFaviconUrl("")}
            />
          </div>
          <div className="min-w-0">
            <Label>Color</Label>
            <p className="text-muted mt-1 mb-2 text-xs leading-relaxed">
              Adjust after the favicon suggestion, or use the system picker and
              preset carousel; past the last preset page, next loads more random
              swatches.
            </p>
            <HexColorSelector
              idPrefix="create-role"
              value={newRoleColor}
              onChange={setNewRoleColor}
              presets={ROLE_COLOR_PRESETS}
              fallbackHex={DEFAULT_ROLE_COLOR}
              nativePickerAriaLabel="Open role color system picker"
              presetsAriaLabel="Role color presets"
            />
          </div>
          <Checkbox
            id="admin-create-role-emailable"
            className="items-start gap-3"
            isSelected={newRoleEmailable}
            onChange={setNewRoleEmailable}
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label
                htmlFor="admin-create-role-emailable"
                className="text-foreground cursor-pointer text-sm font-normal"
              >
                Emailable (for future team and notification routing)
              </Label>
            </Checkbox.Content>
          </Checkbox>
          <div className="border-border border-t pt-2">
            <p className="text-foreground text-sm font-semibold">Permissions</p>
            <p className="text-muted mt-1 mb-3 text-xs leading-relaxed">
              Fine-grained capabilities; admin console access requires at least
              one user-management permission on a role you assign yourself.
            </p>
            <RolePermissionEditor
              selected={newRolePermissions}
              onToggle={toggleNewPermission}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onPress={() => setCreateRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={createRole.isPending || !newRoleName.trim()}
              onPress={() => {
                if (!newRoleName.trim()) return;
                const hex = roleHexColorSchema.safeParse(
                  newRoleColor.trim(),
                );
                if (!hex.success) {
                  showToast(
                    hex.error.issues[0]?.message ?? "Invalid color.",
                    "error",
                  );
                  return;
                }
                const fav = newRoleFaviconUrl.trim();
                if (fav && !z.string().url().safeParse(fav).success) {
                  showToast(
                    "Enter a valid favicon URL or leave empty.",
                    "error",
                  );
                  return;
                }
                createRole.mutate({
                  name: newRoleName.trim(),
                  slug: newRoleSlug.trim() || undefined,
                  description: newRoleDescription.trim() || undefined,
                  color: hex.data,
                  faviconUrl: fav === "" ? undefined : fav,
                  permissions: Array.from(newRolePermissions),
                  isEmailable: newRoleEmailable,
                });
              }}
            >
              Create
            </Button>
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        isOpen={Boolean(editRoleId && editingRole)}
        onClose={() => setEditRoleId(null)}
        title={editingRole ? `Edit ${editingRole.displayName}` : "Edit role"}
        maxWidth="max-w-2xl"
      >
        {editingRole ? (
          <div className="flex min-w-0 flex-col gap-4 pr-1">
            <p className="text-muted text-xs">
              Slug: <code className="text-foreground">{editingRole.slug}</code>
            </p>
            <div className="min-w-0">
              <Label htmlFor="edit-role-name">Name</Label>
              <Input
                id="edit-role-name"
                value={editRoleName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditRoleName(e.target.value)
                }
                className="mt-1 w-full min-w-0"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="edit-role-desc">Description</Label>
              <textarea
                id="edit-role-desc"
                value={editRoleDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditRoleDescription(e.target.value)
                }
                rows={3}
                className="border-border bg-surface text-foreground mt-1 w-full min-w-0 resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="edit-role-favicon">Favicon URL</Label>
              <p className="text-muted mt-1 mb-2 text-xs leading-relaxed">
                Changing the URL re-samples the icon on the server and updates
                the accent color when a dominant hue is found.
              </p>
              <Input
                id="edit-role-favicon"
                value={editRoleFaviconUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditRoleFaviconUrl(e.target.value)
                }
                placeholder="https://…"
                className="mt-1 w-full min-w-0"
              />
              <RoleFaviconUrlPreview
                imageUrl={editRoleFaviconUrl}
                onClear={() => setEditRoleFaviconUrl("")}
              />
            </div>
            <div className="min-w-0">
              <Label>Color</Label>
              <HexColorSelector
                idPrefix="edit-role"
                value={editRoleColor}
                onChange={setEditRoleColor}
                presets={ROLE_COLOR_PRESETS}
                fallbackHex={DEFAULT_ROLE_COLOR}
                nativePickerAriaLabel="Open role color system picker"
                presetsAriaLabel="Role color presets"
              />
            </div>
            <Checkbox
              id="admin-edit-role-emailable"
              className="items-start gap-3"
              isSelected={editRoleEmailable}
              onChange={setEditRoleEmailable}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label
                  htmlFor="admin-edit-role-emailable"
                  className="text-foreground cursor-pointer text-sm font-normal"
                >
                  Emailable (for future team and notification routing)
                </Label>
              </Checkbox.Content>
            </Checkbox>
            {editingRole.isSystem ? (
              <p className="text-muted text-sm leading-relaxed">
                System role permission set is fixed. You can still adjust name,
                description, color, favicon, and emailable flag for how the role
                appears in the directory.
              </p>
            ) : (
              <div className="border-border border-t pt-2">
                <p className="text-foreground text-sm font-semibold">
                  Permissions
                </p>
                <RolePermissionEditor
                  selected={editRolePermissions}
                  onToggle={toggleEditPermission}
                />
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="min-w-0">
                {!editingRole.isSystem ? (
                  <Button
                    variant="danger"
                    size="sm"
                    isDisabled={
                      deleteRole.isPending || updateRole.isPending
                    }
                    onPress={() => {
                      if (
                        confirm(
                          `Delete role "${editingRole.displayName}"? This only succeeds when no users are assigned this role.`,
                        )
                      ) {
                        deleteRole.mutate(
                          { id: editingRole.id },
                          {
                            onSuccess: () => {
                              setEditRoleId(null);
                            },
                          },
                        );
                      }
                    }}
                  >
                    Delete role
                  </Button>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onPress={() => setEditRoleId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  isDisabled={updateRole.isPending || !editRoleName.trim()}
                  onPress={() => {
                    const hex = roleHexColorSchema.safeParse(
                      editRoleColor.trim(),
                    );
                    if (!hex.success) {
                      showToast(
                        hex.error.issues[0]?.message ?? "Invalid color.",
                        "error",
                      );
                      return;
                    }
                    const fav = editRoleFaviconUrl.trim();
                    if (fav && !z.string().url().safeParse(fav).success) {
                      showToast(
                        "Enter a valid favicon URL or leave empty.",
                        "error",
                      );
                      return;
                    }
                    updateRole.mutate({
                      id: editingRole.id,
                      name: editRoleName.trim(),
                      description: editRoleDescription.trim() || null,
                      color: hex.data,
                      faviconUrl: fav === "" ? null : fav,
                      isEmailable: editRoleEmailable,
                      ...(!editingRole.isSystem
                        ? { permissions: Array.from(editRolePermissions) }
                        : {}),
                    });
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </SimpleDialog>
    </div>
  );
}
