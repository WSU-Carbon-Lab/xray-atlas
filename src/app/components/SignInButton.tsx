"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { DefaultButton } from "./Button";
import { SignInModal } from "./SignInModal";
import { isDevelopment } from "~/utils/isDevelopment";

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
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isDev = isDevelopment();

  const afterSignInUrl = pathname && pathname !== "/" ? pathname : "/";

  const handleSignIn = () => {
    if (isDev) {
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(afterSignInUrl)}`,
      );
    } else {
      setIsOpen(true);
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
      <DefaultButton variant={variant} size={size} onPress={handleSignIn}>
        {children}
      </DefaultButton>
      {!isDev && (
        <SignInModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          callbackUrl={afterSignInUrl}
        />
      )}
    </>
  );
}
