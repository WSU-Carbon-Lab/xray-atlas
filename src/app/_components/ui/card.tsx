import React from "react";
import { cn } from "./utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "base" | "outline";
  size?: "sm" | "md" | "lg";
  elevated?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = "base",
  size = "md",
  elevated = false,
  gradient = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white transition-all",
        variant === "outline" ? "border-gray-200" : "border-transparent",
        size === "sm" && "p-2",
        size === "md" && "p-4",
        size === "lg" && "p-6",
        elevated && "shadow-lg",
        gradient && "bg-gradient-to-r from-gray-50 to-zinc-100",
        className,
      )}
      {...props}
    />
  );
};

export const ImageCard: React.FC<CardProps> = ({ className, ...props }) => (
  <Card
    className={cn(
      "flex aspect-square items-center justify-center overflow-hidden p-0",
      className,
    )}
    {...props}
  />
);
