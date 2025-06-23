import React from "react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { cn } from "./utils";

export const CopyButton: React.FC<{
  textToCopy: string;
  className?: string;
}> = ({ textToCopy, className }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // fallback or error
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`rounded-lg p-1.5 transition-colors hover:bg-gray-200 ${className || ""}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <span className="text-xs text-green-600">Copied!</span>
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );
};

export const InfoButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }
> = ({ className, fullWidth, ...props }) => (
  <button
    className={cn(
      "group rounded-lg border bg-gray-50 p-4 text-left text-base font-medium transition-all duration-200 hover:bg-gray-100 hover:ring-1 hover:ring-wsu-crimson focus:outline-none focus:ring-2 focus:ring-wsu-crimson focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      fullWidth && "w-full",
      className,
    )}
    {...props}
  />
);
