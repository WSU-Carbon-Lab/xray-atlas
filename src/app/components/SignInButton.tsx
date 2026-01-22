"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { DefaultButton as Button } from "./Button";
import { SignInModal } from "./SignInModal";
import { isDevelopment } from "~/utils/isDevelopment";
import type { ButtonProps } from "@heroui/react";

interface SignInButtonProps extends Omit<ButtonProps, "onClick"> {
  children?: React.ReactNode;
}

export function SignInButton({
  children = "Sign In",
  ...buttonProps
}: SignInButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const isDev = isDevelopment();

  const afterSignInUrl = pathname && pathname !== "/" ? pathname : "/";

  const handleSignIn = () => {
    if (isDev) {
      const signInUrl = `/sign-in?redirect_url=${encodeURIComponent(
        afterSignInUrl,
      )}`;
      router.push(signInUrl);
    } else {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (isSignedIn && isOpen) {
      setIsOpen(false);
    }
  }, [isSignedIn, isOpen]);

  if (isSignedIn) {
    return null;
  }

  return (
    <>
      <Button {...buttonProps} onClick={handleSignIn}>
        {children}
      </Button>
      {!isDev && (
        <SignInModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
