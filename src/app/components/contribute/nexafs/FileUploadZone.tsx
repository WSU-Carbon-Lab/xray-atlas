"use client";

import { useCallback, useState, useRef } from "react";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // validateFile is defined in the component scope and uses maxFileSize and acceptedFileTypes
      // which are already in the dependency array, so it's safe to omit

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
      // Directly modifying e.target.value is generally unreliable in React due to synthetic events, so we use a ref instead
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles],
  );

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-4 transition-colors ${
          isDragging
            ? "border-accent bg-accent/5 dark:border-accent dark:bg-accent/10"
            : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          accept={acceptedFileTypes.join(",")}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="flex items-center justify-center gap-3 text-center">
          <CloudArrowUpIcon
            className={`h-6 w-6 shrink-0 transition-colors ${
              isDragging
                ? "text-accent dark:text-accent-light"
                : "text-gray-400 dark:text-gray-500"
            }`}
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isDragging ? "Drop files here" : "Drag and drop CSV files here"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              or click to browse • CSV files only • Max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB per file
              {multiple && " • Multiple files supported"}
            </p>
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
