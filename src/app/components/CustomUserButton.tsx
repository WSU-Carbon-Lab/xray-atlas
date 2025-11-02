"use client";

import { useEffect } from "react";
import { UserButton as ClerkUserButton } from "@clerk/nextjs";

interface CustomUserButtonProps {
  appearance?: {
    elements?: {
      userButtonAvatarBox?: string;
      userButtonRoot?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export default function CustomUserButton({
  appearance,
}: CustomUserButtonProps) {
  // Sync user to database when component mounts via API call
  useEffect(() => {
    const syncUser = async () => {
      try {
        await fetch("/api/users/sync", {
          method: "POST",
        });
      } catch (error) {
        console.error("Failed to sync user:", error);
      }
    };

    syncUser();
  }, []);

  return (
    <ClerkUserButton
      appearance={appearance}
      afterSignOutUrl="/"
    />
  );
}
