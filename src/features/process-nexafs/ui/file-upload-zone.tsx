"use client";

import { useCallback, useState, useRef } from "react";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  multiple?: boolean;
}

export function FileUploadZone({
  onFilesSelected,
  acceptedFileTypes = [".csv", "text/csv", ".json", "application/json"],
  maxFileSize = 10 * 1024 * 1024,
  multiple = true,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedFileType, setDraggedFileType] = useState<"csv" | "json" | "mixed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const validateFile = (file: File): string | null => {
        const fileName = file.name.toLowerCase();
        const isCsv = fileName.endsWith(".csv");
        const isJson = fileName.endsWith(".json");

        const isValidType =
          acceptedFileTypes.some((type) => {
            if (type.startsWith(".")) {
              return fileName.endsWith(type.toLowerCase());
            }
            return file.type === type;
          }) || file.type === "" || isCsv || isJson;

        if (!isValidType && !isCsv && !isJson) {
          return `Invalid file type. Expected CSV or JSON file, got: ${file.type ?? "unknown"}`;
        }

        if (file.size > maxFileSize) {
          const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1);
          return `File too large. Maximum size is ${maxSizeMB}MB, got ${(file.size / (1024 * 1024)).toFixed(1)}MB`;
        }

        return null;
      };

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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = Array.from(e.dataTransfer.items);
      const fileTypes = items
        .filter((item) => item.kind === "file")
        .map((item) => {
          const mimeType = item.type.toLowerCase();
          if (mimeType === "application/json" || mimeType === "text/json") return "json";
          if (mimeType === "text/csv" || mimeType === "application/csv") return "csv";
          return null;
        })
        .filter((type): type is "csv" | "json" => type !== null);

      if (fileTypes.length > 0) {
        const uniqueTypes = Array.from(new Set(fileTypes));
        if (uniqueTypes.length === 1) {
          setDraggedFileType(uniqueTypes[0]!);
        } else {
          setDraggedFileType("mixed");
        }
      }
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDraggedFileType(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setDraggedFileType(null);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
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
        className={`group bg-background/40 relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border-2 border-dashed px-5 py-5 text-left transition-[transform,box-shadow,border-color] duration-200 ${
          isDragging
            ? "border-accent bg-accent/10 shadow-lg"
            : "border-border hover:border-accent hover:bg-accent/5 hover:-translate-y-0.5 hover:shadow-md"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload"
          accept=".csv,.json,text/csv,application/json"
          multiple={multiple}
          onChange={handleFileInputChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <div className="flex flex-col gap-2">
          <span className="text-accent text-sm font-semibold tracking-wide uppercase">
            Upload CSV or JSON files
          </span>
          <span className="text-foreground text-base transition-colors duration-200">
            {isDragging
              ? draggedFileType === "json"
                ? "Drop JSON file here"
                : draggedFileType === "csv"
                  ? "Drop CSV file here"
                  : "Drop files here"
              : "Drag and drop CSV or JSON files here"}
          </span>
          <span className="text-muted text-sm">
            or click to browse • Max {(maxFileSize / (1024 * 1024)).toFixed(0)}MB per file
            {multiple ? " • Multiple files supported" : null}
          </span>
        </div>
        <div className="text-muted hidden shrink-0 transition-colors duration-200 group-hover:text-accent md:block">
          <CloudArrowUpIcon
            className={`h-14 w-14 transition-colors ${
              isDragging ? "text-accent" : "group-hover:text-accent"
            }`}
            aria-hidden="true"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
          <XMarkIcon className="h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">File validation errors:</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs">{error}</pre>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/30"
            aria-label="Dismiss"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
