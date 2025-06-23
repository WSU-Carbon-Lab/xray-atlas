import React from "react";
import { Dialog } from "@headlessui/react";
import { cn } from "./utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: "md" | "lg" | "xl";
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  size = "md",
  children,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    className="fixed inset-0 z-50 flex items-center justify-center"
  >
    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div
      className={cn(
        "relative rounded-xl bg-white shadow-lg transition-all",
        size === "md" && "w-full max-w-md p-6",
        size === "lg" && "w-full max-w-lg p-8",
        size === "xl" && "w-full max-w-3xl p-10",
      )}
    >
      {children}
    </div>
  </Dialog>
);

export const ModalContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div className="space-y-6">{children}</div>;
