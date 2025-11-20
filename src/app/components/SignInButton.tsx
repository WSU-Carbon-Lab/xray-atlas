"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { DefaultButton as Button } from "./Button";
import { SignInModal } from "./SignInModal";
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

  // Close modal when user successfully signs in
  useEffect(() => {
    if (isSignedIn && isOpen) {
      setIsOpen(false);
    }
  }, [isSignedIn, isOpen]);

  // Don't render if already signed in
  if (isSignedIn) {
    return null;
  }

  return (
    <>
      <Button {...buttonProps} onClick={() => setIsOpen(true)}>
        {children}
      </Button>
      <SignInModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
