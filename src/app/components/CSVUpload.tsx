"use client";

import { useRef, useState } from "react";
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

interface CSVUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFileTypes?: string;
  maxSizeMB?: number;
  label?: string;
  description?: string;
  error?: string;
  file?: File | null;
  onRemove?: () => void;
}

export function CSVUpload({
  onFileSelect,
  acceptedFileTypes = ".csv",
  maxSizeMB = 10,
  label = "Upload CSV File",
  description,
  error,
  file,
  onRemove,
}: CSVUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);

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
    onFileSelect(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

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
    const selectedFile = e.target.files?.[0];
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

      {file ? (
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
              ? "border-wsu-crimson bg-wsu-crimson/5"
              : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
          } ${error || dragError ? "border-red-300 dark:border-red-700" : ""}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes}
            onChange={handleInputChange}
            className="hidden"
          />
          <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {acceptedFileTypes} up to {maxSizeMB}MB
          </p>
        </div>
      )}

      {(error || dragError) && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>{error || dragError}</span>
        </div>
      )}
    </div>
  );
}
