"use client";

import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { Button } from "~/app/_components/ui/button";
import { cn } from "~/lib/utils";

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
  className?: string;
  showCopy?: boolean;
}

export function CodeBlock({
  children,
  language = "bash",
  filename,
  className,
  showCopy = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className={cn("not-prose relative", className)}>
      {filename && (
        <div className="rounded-t-lg border border-b-0 border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
          {filename}
        </div>
      )}
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          customStyle={{
            margin: 0,
            borderRadius: filename ? "0 0 0.5rem 0.5rem" : "0.5rem",
            border: "1px solid rgb(229 231 235)",
            fontSize: "0.875rem",
            lineHeight: "1.25rem",
          }}
          showLineNumbers={false}
          wrapLines={false}
          wrapLongLines={true}
        >
          {children.trim()}
        </SyntaxHighlighter>
        {showCopy && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 bg-white/90 hover:bg-white"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">{copied ? "Copied!" : "Copy code"}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
