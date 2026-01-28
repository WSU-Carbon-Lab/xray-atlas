"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { PageSkeleton } from "~/app/components/LoadingState";
import { Button, Tooltip } from "@heroui/react";
import Link from "next/link";
import { Settings, Palette, Bell, User, ArrowRight, Sun, Moon, Monitor } from "lucide-react";
import { type Theme } from "~/app/components/theme/constants";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { data: user, isLoading: isLoadingUser } = trpc.users.getCurrent.useQuery(
    undefined,
    {
      enabled: !!session?.user,
    },
  );
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (status === "loading" || isLoadingUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageSkeleton />
      </div>
    );
  }

  if (!session?.user || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-xl border border-border-default bg-surface-1 p-8">
          <h1 className="mb-4 text-2xl font-bold text-text-primary">
            Access Denied
          </h1>
          <p className="text-text-secondary">
            Please sign in to access application settings.
          </p>
        </div>
      </div>
    );
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const currentTheme = mounted ? (theme ?? "system") : "system";
  const displayTheme = mounted ? resolvedTheme ?? "light" : "light";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-text-secondary transition-colors hover:text-accent"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-1 p-8">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold text-text-primary">
              Application Settings
            </h1>
          </div>
          <p className="text-text-secondary">
            Manage your application preferences and display options
          </p>
        </div>

        <div className="space-y-8">
          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Palette className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Appearance
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="mb-4 text-sm text-text-secondary">
                  Choose how the application appears. System will match your device settings.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Theme preferences are saved locally in your browser and will persist across sessions.
                </p>
              </Tooltip.Content>
            </Tooltip>

            <div className="flex flex-wrap gap-3">
              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "light" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("light")}
                    className="min-w-[120px]"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Use light theme</p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "dark" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("dark")}
                    className="min-w-[120px]"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Use dark theme</p>
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant={currentTheme === "system" ? "primary" : "outline"}
                    onPress={() => handleThemeChange("system")}
                    className="min-w-[120px]"
                  >
                    <Monitor className="h-4 w-4" />
                    <span>System</span>
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  <p>Match your device theme</p>
                </Tooltip.Content>
              </Tooltip>
            </div>

            {mounted && currentTheme === "system" && (
              <p className="mt-3 text-sm text-text-tertiary">
                Currently using {displayTheme === "dark" ? "dark" : "light"} theme based on your system settings
              </p>
            )}
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <User className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Account Settings
              </h2>
            </div>
            <p className="mb-4 text-sm text-text-secondary">
              Manage your account information and profile settings
            </p>
            <Button
              variant="outline"
              onPress={() => router.push(`/users/${user.id}`)}
            >
              <User className="h-4 w-4" />
              <span>View Profile Settings</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t border-border-default pt-8">
            <div className="mb-4 flex items-center gap-3">
              <Bell className="h-5 w-5 text-text-secondary" />
              <h2 className="text-xl font-semibold text-text-primary">
                Notification Preferences
              </h2>
            </div>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <p className="text-sm text-text-secondary">
                  Notification preferences will be available here.
                </p>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>
                  Configure email notifications, browser notifications, and other alerts.
                </p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
