"use client";

import { useEffect, type ComponentProps } from "react";
import { UserButton as ClerkUserButton } from "@clerk/nextjs";
import { trpc } from "~/trpc/client";

type ClerkUserButtonProps = ComponentProps<typeof ClerkUserButton>;

interface CustomUserButtonProps {
  appearance?: ClerkUserButtonProps["appearance"];
}

export default function CustomUserButton({
  appearance,
}: CustomUserButtonProps) {
  const syncUser = trpc.users.sync.useMutation();

  // Sync user to database when component mounts
  useEffect(() => {
    void syncUser.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ClerkUserButton
      appearance={appearance}
      afterSignOutUrl="/"
    />
  );
}
