"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { inferRouterOutputs } from "@trpc/server";
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
} from "@heroui/react";
import { cn } from "@heroui/styles";
import { ChevronUp, Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { trpc } from "~/trpc/client";
import type { AppRouter } from "~/server/api/root";
import { CustomAvatar } from "~/components/ui/avatar";
import { ORCIDIcon } from "~/components/icons";
import { SimpleDialog } from "~/components/ui/dialog";
import { showToast } from "~/components/ui/toast";
import { isLineageRoleSlug } from "~/lib/app-role-lineage";

const PAGE_SIZE = 20;

type RouterOutputs = inferRouterOutputs<AppRouter>;
type AdminUserRow = RouterOutputs["admin"]["listUsers"]["rows"][number];

type UserSortColumn = "member" | "orcid" | "roles";

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
      role: { id: string; displayName: string; slug: string };
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
  const [newSlug, setNewSlug] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLabs, setNewLabs] = useState(false);
  const [newManage, setNewManage] = useState(false);

  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLabs, setEditLabs] = useState(false);
  const [editManage, setEditManage] = useState(false);

  const [userSort, setUserSort] = useState<{
    column: UserSortColumn;
    direction: "asc" | "desc";
  }>({ column: "member", direction: "asc" });

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

  const createRole = trpc.admin.createRole.useMutation({
    onSuccess: async () => {
      showToast("Role created.", "success");
      setCreateRoleOpen(false);
      setNewSlug("");
      setNewDisplayName("");
      setNewDescription("");
      setNewLabs(false);
      setNewManage(false);
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
    setEditDisplayName(editingRole.displayName);
    setEditDescription(editingRole.description ?? "");
    setEditLabs(editingRole.canAccessLabs);
    setEditManage(editingRole.canManageUsers);
  }, [editingRole]);

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
          const ar = [...a.userAppRoles.map((x) => x.role.displayName)]
            .sort()
            .join(", ");
          const br = [...b.userAppRoles.map((x) => x.role.displayName)]
            .sort()
            .join(", ");
          cmp = ar.localeCompare(br);
          break;
        }
        default:
          cmp = 0;
      }
      return cmp * mul;
    });
  }, [listUsers.data?.rows, userSort]);

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
        <Card className="border-border bg-surface-1 order-2 overflow-hidden border shadow-sm lg:order-none lg:col-span-4 xl:col-span-4">
          <Card.Header className="border-border flex flex-row flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
            <div>
              <Card.Title className="text-foreground text-base font-semibold">
                Roles
              </Card.Title>
              <Card.Description className="text-muted mt-0.5 text-xs">
                System and custom capabilities
              </Card.Description>
            </div>
            <Button
              size="sm"
              variant="primary"
              onPress={() => setCreateRoleOpen(true)}
            >
              Create role
            </Button>
          </Card.Header>
          <Card.Content className="border-border bg-surface-2/10 border-t p-5">
            {listRoles.isLoading ? (
              <p className="text-muted text-sm">Loading roles…</p>
            ) : (listRoles.data?.length ?? 0) === 0 ? (
              <p className="text-muted text-sm">No roles defined.</p>
            ) : (
              <ul
                className="m-0 flex list-none flex-wrap gap-2 p-0"
                aria-label="Application roles"
              >
                {(listRoles.data ?? []).map((role) => (
                  <li key={role.id}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => openEditRole(role.id)}
                      aria-label={`Edit role ${role.displayName}`}
                      className={cn(
                        "border-border hover:bg-default data-[hovered]:bg-default h-auto rounded-full border py-2 pr-2.5 pl-3.5 transition-colors",
                        role.isSystem
                          ? "bg-surface-2/50"
                          : "bg-surface-2/80 hover:border-accent/30",
                      )}
                    >
                      <span className="text-foreground flex items-center gap-2 text-sm font-medium">
                        {role.displayName}
                        {role.isSystem ? (
                          <span className="text-muted font-normal">(system)</span>
                        ) : null}
                        <Pencil
                          className="text-muted size-3.5 shrink-0 opacity-80"
                          aria-hidden
                        />
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card.Content>
        </Card>

        <Card className="border-border bg-surface-1 order-1 overflow-hidden border shadow-sm lg:order-none lg:col-span-8 xl:col-span-8">
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
                      <SearchField.ClearButton className="text-muted h-7 w-7 shrink-0 rounded-md p-0.5" />
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
                              <Chip key={ur.role.id} size="sm" variant="soft">
                                {ur.role.displayName}
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
          </Card.Content>
          <Card.Footer className="border-border bg-surface-1 text-muted flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm">
            <span>
              Page {currentPage} of {totalPages} (
              {listUsers.data?.total ?? 0} users)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                isDisabled={skip <= 0}
                onPress={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={
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
                {listRoles.data.map((role) => (
                  <Checkbox
                    key={role.id}
                    isSelected={selectedRoleIds.has(role.id)}
                    onChange={() => toggleRoleSelection(role.id, role.slug)}
                  >
                    <span className="text-sm">
                      {role.displayName}{" "}
                      <span className="text-muted">({role.slug})</span>
                    </span>
                  </Checkbox>
                ))}
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
          This cannot be undone.
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
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="new-role-slug">Slug</Label>
            <Input
              id="new-role-slug"
              value={newSlug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewSlug(e.target.value)
              }
              placeholder="e.g. trusted-reviewer"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-role-name">Display name</Label>
            <Input
              id="new-role-name"
              value={newDisplayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewDisplayName(e.target.value)
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-role-desc">Description (optional)</Label>
            <Input
              id="new-role-desc"
              value={newDescription}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewDescription(e.target.value)
              }
              className="mt-1"
            />
          </div>
          <Checkbox isSelected={newLabs} onChange={() => setNewLabs((v) => !v)}>
            Can access Labs
          </Checkbox>
          <Checkbox
            isSelected={newManage}
            onChange={() => setNewManage((v) => !v)}
          >
            Can manage users
          </Checkbox>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onPress={() => setCreateRoleOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={
                createRole.isPending ||
                !newSlug.trim() ||
                !newDisplayName.trim()
              }
              onPress={() => {
                createRole.mutate({
                  slug: newSlug.trim(),
                  displayName: newDisplayName.trim(),
                  description: newDescription.trim() || undefined,
                  canAccessLabs: newLabs,
                  canManageUsers: newManage,
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
        maxWidth="max-w-lg"
      >
        {editingRole ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted text-xs">
              Slug: <code>{editingRole.slug}</code>
            </p>
            <div>
              <Label htmlFor="edit-role-name">Display name</Label>
              <Input
                id="edit-role-name"
                value={editDisplayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditDisplayName(e.target.value)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-role-desc">Description</Label>
              <Input
                id="edit-role-desc"
                value={editDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditDescription(e.target.value)
                }
                className="mt-1"
              />
            </div>
            {!editingRole.isSystem ? (
              <>
                <Checkbox
                  isSelected={editLabs}
                  onChange={() => setEditLabs((v) => !v)}
                >
                  Can access Labs
                </Checkbox>
                <Checkbox
                  isSelected={editManage}
                  onChange={() => setEditManage((v) => !v)}
                >
                  Can manage users
                </Checkbox>
              </>
            ) : (
              <p className="text-muted text-sm">
                System role capabilities are fixed; you can edit the display
                name and description only.
              </p>
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
                  isDisabled={updateRole.isPending || !editDisplayName.trim()}
                  onPress={() => {
                    updateRole.mutate({
                      id: editingRole.id,
                      displayName: editDisplayName.trim(),
                      description: editDescription.trim() || null,
                      ...(!editingRole.isSystem
                        ? {
                            canAccessLabs: editLabs,
                            canManageUsers: editManage,
                          }
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
