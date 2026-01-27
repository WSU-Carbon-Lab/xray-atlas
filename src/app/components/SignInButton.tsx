"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { DefaultButton } from "./Button";

interface SignInButtonProps {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function SignInButton({
  children = "Sign In",
  variant = "primary",
  size = "sm",
}: SignInButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const afterSignInUrl = pathname && pathname !== "/" ? pathname : "/";

  const handleSignIn = () => {
    router.push(
      `/sign-in?callbackUrl=${encodeURIComponent(afterSignInUrl)}`,
    );
  };

  if (session?.user) {
    return null;
  }

  return (
    <DefaultButton variant={variant} size={size} onPress={handleSignIn}>
      {children}
    </DefaultButton>
  );
}
