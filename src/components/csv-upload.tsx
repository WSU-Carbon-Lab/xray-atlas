"use client";

import { useRef, useState } from "react";
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface CSVUploadProps {
  onFileSelect?: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  acceptedFileTypes?: string | string[];
  maxSizeMB?: number;
  label?: string;
  description?: string;
  error?: string;
  file?: File | null;
  onRemove?: () => void;
  files?: File[];
  multiple?: boolean;
}

export function CSVUpload({
  onFileSelect,
  onFilesSelect,
  acceptedFileTypes = ".csv",
  maxSizeMB = 10,
  label = "Upload CSV File",
  description,
  error,
  file,
  onRemove,
  files = [],
  multiple = false,
}: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const effectiveError = error ?? dragError;
  const hasError = Boolean(effectiveError);

  const acceptedTypesValue = Array.isArray(acceptedFileTypes)
    ? acceptedFileTypes.join(",")
    : acceptedFileTypes;

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return "File must be a CSV file (.csv)";
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setDragError(validationError);
      return;
    }

    setDragError(null);
    onFileSelect?.(selectedFile);
  };

  const handleFilesSelect = (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles ?? []);
    if (fileArray.length === 0) {
      return;
    }

    const invalid = fileArray.find((selectedFile) =>
      validateFile(selectedFile),
    );
    if (invalid) {
      setDragError(validateFile(invalid));
      return;
    }

    setDragError(null);
    onFilesSelect?.(fileArray);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (multiple && onFilesSelect) {
      handleFilesSelect(e.dataTransfer.files);
      return;
    }

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFileList = e.target.files;
    if (!selectedFileList || selectedFileList.length === 0) {
      return;
    }

    if (multiple && onFilesSelect) {
      handleFilesSelect(selectedFileList);
      return;
    }

    const selectedFile = selectedFileList[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}

      {multiple && files.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </div>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {files.map((selectedFile) => (
              <li key={`${selectedFile.name}-${selectedFile.size}`}>
                {selectedFile.name} • {formatFileSize(selectedFile.size)}
              </li>
            ))}
          </ul>
        </div>
      ) : file ? (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
              aria-label="Remove file"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-accent bg-accent/5"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
          } ${hasError ? "border-red-300 dark:border-red-700" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypesValue}
            multiple={multiple}
            onChange={handleInputChange}
            className="hidden"
          />
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {acceptedTypesValue} up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{effectiveError}</span>
        </div>
      )}
    </div>
  );
}
