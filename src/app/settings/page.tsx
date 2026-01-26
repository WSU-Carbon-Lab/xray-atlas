"use client";

import { useSession } from "next-auth/react";
import { PageSkeleton } from "~/app/components/LoadingState";
import Link from "next/link";
import { Avatar } from "@heroui/react";

export default function SettingsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please sign in to access your account preferences.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-accent dark:text-gray-400 dark:hover:text-accent"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Account Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar size="lg" className="h-24 w-24">
              {session.user.image ? (
                <Avatar.Image
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                />
              ) : null}
              <Avatar.Fallback>
                {session.user.name?.charAt(0).toUpperCase() ?? "U"}
              </Avatar.Fallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {session.user.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{session.user.email}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Profile Settings
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Profile settings and preferences will be available here.
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
            <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Notification Preferences
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Notification preferences will be available here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
