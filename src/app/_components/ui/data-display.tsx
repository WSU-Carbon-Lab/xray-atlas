"use client";

import React, { useState } from "react";
// import { CopyButton } from "./button";
import { cn } from "./utils";

export interface InfoSectionProps {
  title: string;
  content: string;
  mono?: boolean;
  copyable?: boolean;
  className?: string;
}

export const InfoSection = React.forwardRef<HTMLDivElement, InfoSectionProps>(
  ({ title, content, mono = false, copyable = true, className }, ref) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
      if (!copyable) return;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(content ?? "");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (err) {
        console.error("Failed to copy text: ", err);
        // fallback or error
      }
    };

    return (
      <div
        ref={ref}
        className={cn("border-b border-gray-100 pb-4 last:border-0", className)}
      >
        <h4 className="mb-2 text-sm font-medium text-gray-500">{title}</h4>
        <div className="group relative">
          <pre
            className={cn(
              "whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-4 text-sm",
              mono ? "font-mono" : "",
              copyable ? "pr-10" : "",
            )}
          >
            {content}
          </pre>
          {copyable && (
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="rounded-lg p-1.5 transition-colors hover:bg-gray-200"
                title="Copy to clipboard"
              >
                {copied ? (
                  <span className="text-xs text-green-600">Copied!</span>
                ) : (
                  <span>📋</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
InfoSection.displayName = "InfoSection";

export interface InfoItemProps {
  title: string;
  content: string;
  mono?: boolean;
  className?: string;
}

export const InfoItem = React.forwardRef<HTMLDivElement, InfoItemProps>(
  ({ title, content, mono = false, className }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col space-y-1.5", className)}>
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          {title}
        </span>
        <span
          className={cn("text-base text-gray-900", mono ? "font-mono" : "")}
        >
          {content}
        </span>
      </div>
    );
  },
);
InfoItem.displayName = "InfoItem";

export interface InfoItemWithCopyProps extends InfoItemProps {
  copyable?: boolean;
  showCopyButton?: boolean;
}

export const InfoItemWithCopy = React.forwardRef<
  HTMLDivElement,
  InfoItemWithCopyProps
>(
  (
    {
      title,
      content,
      mono = false,
      copyable = false,
      showCopyButton = false,
      className,
    },
    ref,
  ) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
        // fallback or error
      }
    };

    return (
      <div ref={ref} className={cn("flex flex-col space-y-1.5", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {title}
          </span>
          {(copyable || showCopyButton) && (
            <button
              onClick={handleCopy}
              className={cn(
                "ml-2 rounded-lg p-1.5 transition-colors hover:bg-gray-200",
              )}
              title="Copy to clipboard"
            >
              {copied ? (
                <span className="text-xs text-green-600">Copied!</span>
              ) : (
                <span>📋</span>
              )}
            </button>
          )}
        </div>
        <span
          className={cn("text-base text-gray-900", mono ? "font-mono" : "")}
        >
          {content}
        </span>
      </div>
    );
  },
);
InfoItemWithCopy.displayName = "InfoItemWithCopy";

export const NameList: React.FC<{
  title: string;
  items: string[];
  maxItems?: number;
  truncateLength?: number;
}> = ({ title, items, maxItems = 2, truncateLength = 10 }) => {
  const uniqueItems = Array.from(new Set(items));
  const displayedItems = uniqueItems.slice(0, maxItems);
  const hasMore = uniqueItems.length > maxItems;
  const names = displayedItems.join(", ") + (hasMore ? "..." : "");

  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </span>
      <TruncatedPreview content={names} len={truncateLength} bold={true} />
    </div>
  );
};

export const TruncatedPreview: React.FC<{
  content: string;
  len?: number;
  mono?: boolean;
  bold?: boolean;
}> = ({ content, len = 20, mono = false, bold = false }) => (
  <span
    className={cn(
      mono ? "font-mono" : "",
      bold ? "font-semibold" : "",
      "block max-w-full truncate",
    )}
    title={content}
  >
    {content.length > len ? content.substring(0, len) + "..." : content}
  </span>
);
