"use client";

import { useEffect } from "react";
import { UserButton as ClerkUserButton } from "@clerk/nextjs";
import { trpc } from "~/trpc/client";

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
  const syncUser = trpc.users.sync.useMutation();

  // Sync user to database when component mounts
  useEffect(() => {
    syncUser.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ClerkUserButton
      appearance={appearance}
      afterSignOutUrl="/"
    />
  );
}
