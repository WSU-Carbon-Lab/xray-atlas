"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { SignInModal } from "./SignInModal";
import { isDevelopment } from "~/utils/isDevelopment";

interface SignInButtonProps {
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function SignInButton({
  children = "Sign In",
  variant = "outline",
  size = "sm",
}: SignInButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isDev = isDevelopment();

  const afterSignInUrl = pathname && pathname !== "/" ? pathname : "/";

  const handleSignIn = () => {
    if (isDev) {
      const signInUrl = `/sign-in?callbackUrl=${encodeURIComponent(
        afterSignInUrl,
      )}`;
      router.push(signInUrl);
    } else {
      void signIn("orcid", { callbackUrl: afterSignInUrl });
    }
  };

  useEffect(() => {
    if (session?.user && isOpen) {
      setIsOpen(false);
    }
  }, [session, isOpen]);

  if (session?.user) {
    return null;
  }

  return (
    <>
      <Button variant={variant} size={size} onPress={handleSignIn}>
        {children}
      </Button>
      {!isDev && (
        <SignInModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
