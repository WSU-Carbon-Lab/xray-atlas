"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
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
      <Button {...buttonProps} onClick={handleSignIn}>
        {children}
      </Button>
      {!isDev && (
        <SignInModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
