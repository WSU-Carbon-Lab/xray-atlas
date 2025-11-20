"use client";

import { useCallback, useState } from "react";
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { DefaultButton as Button } from "~/app/components/Button";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  multiple?: boolean;
}

export function FileUploadZone({
  onFilesSelected,
  acceptedFileTypes = [".csv", "text/csv"],
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  multiple = true,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const isValidType =
      acceptedFileTypes.some((type) => {
        if (type.startsWith(".")) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type === type;
      }) || file.type === ""; // Some browsers don't set CSV MIME type

    if (!isValidType && !file.name.toLowerCase().endsWith(".csv")) {
      return `Invalid file type. Expected CSV file, got: ${file.type || "unknown"}`;
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
      return `File too large. Maximum size is ${maxSizeMB}MB, got ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
    }

    return null;
  };

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      setError(null);
      const validFiles: File[] = [];
      const errors: string[] = [];

      Array.from(files).forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, maxFileSize, acceptedFileTypes],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFiles],
  );

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? "border-wsu-crimson bg-wsu-crimson/5 dark:border-wsu-crimson dark:bg-wsu-crimson/10"
            : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/40"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          accept={acceptedFileTypes.join(",")}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <CloudArrowUpIcon
            className={`h-12 w-12 transition-colors ${
              isDragging
                ? "text-wsu-crimson"
                : "text-gray-400 dark:text-gray-500"
            }`}
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isDragging ? "Drop files here" : "Drag and drop CSV files here"}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              or click to browse
            </p>
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            <p>CSV files only • Max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB per file</p>
            {multiple && <p className="mt-1">Multiple files supported</p>}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
          <div className="flex items-start gap-2">
            <XMarkIcon className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">File validation errors:</p>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{error}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
