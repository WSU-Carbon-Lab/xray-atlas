"use client";

import { ToastContainer, useToast } from "~/components/ui/toast";

/**
 * Mounts a single toast surface at the layout root so `showToast` broadcasts
 * are visible even on routes that don't mount their own `ToastContainer`
 * (e.g. `/browse/nexafs`, everything under `/admin`). Without this, toasts
 * fired from those routes were enqueued into `toastListeners` but had no
 * listener to render them, so success/failure/cancellation feedback for
 * destructive actions (dataset delete, admin catalog delete, passkey
 * enrollment) was silently dropped.
 *
 * Note: a handful of pages (e.g. molecule detail, contribute/nexafs, profile
 * pages) already mount their own local `useToast`/`ToastContainer` pair. Both
 * that local listener and this global one receive every `showToast(...)`
 * broadcast, so on those specific routes a globally-broadcast toast will
 * render twice (once per mounted container). See the passkey-management fix
 * report for details — resolving that fully requires either migrating those
 * pages off their local containers or reworking `useToast` into a singleton
 * store, both out of scope for this change.
 */
export function GlobalToastContainer() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onRemove={removeToast} />;
}
