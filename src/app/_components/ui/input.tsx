"use client";

import React from "react";
import { cn } from "./utils";

// Input variants
const inputVariants = {
  default: "border-gray-300 focus:border-wsu-crimson focus:ring-wsu-crimson/20",
  search:
    "border-gray-300 focus:border-wsu-crimson focus:ring-wsu-crimson/20 rounded-lg",
  error: "border-red-300 focus:border-red-500 focus:ring-red-500/20",
} as const;

const inputSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-4 py-3 text-lg",
} as const;

// Base Input Component
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof inputVariants;
  inputSize?: keyof typeof inputSizes;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, variant = "default", inputSize = "md", type, ...props },
    ref,
  ) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full rounded-md border bg-white transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          inputVariants[variant],
          inputSizes[inputSize],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

// Search Input Component
export interface SearchInputProps extends Omit<InputProps, "variant"> {
  onClear?: () => void;
  showClearButton?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, showClearButton = true, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          ref={ref}
          variant="search"
          className={cn("", className)}
          {...props}
        />
        {showClearButton && props.value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
