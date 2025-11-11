"use client";

import { FieldTooltip } from "./FieldTooltip";

type FormFieldValue = string | number | "";

type FormFieldProps = {
  label: string;
  tooltip?: string;
  type: "text" | "textarea" | "number" | "select" | "date";
  name: string;
  value: any;
  onChange: (value: FormFieldValue) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  rows?: number;
};

export function FormField({
  label,
  tooltip,
  type,
  name,
  value,
  onChange,
  error,
  helperText,
  required = false,
  placeholder,
  options = [],
  min,
  max,
  step,
  disabled = false,
  rows = 3,
}: FormFieldProps) {
  const baseInputClasses =
    "focus:border-wsu-crimson focus:ring-wsu-crimson/20 w-full rounded-lg border bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";
  const errorInputClasses = error
    ? "border-red-300 dark:border-red-700"
    : "border-gray-300 dark:border-gray-600";

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (type === "number") {
      const numValue = e.target.value === "" ? "" : parseFloat(e.target.value);
      onChange(Number.isNaN(numValue) ? "" : numValue);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && <FieldTooltip description={tooltip} />}
      </label>

      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value ?? ""}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${baseInputClasses} ${errorInputClasses}`}
        />
      ) : type === "select" ? (
        <select
          id={name}
          name={name}
          value={value ?? ""}
          onChange={handleChange}
          required={required}
          disabled={disabled}
          className={`${baseInputClasses} ${errorInputClasses}`}
        >
          <option value="" disabled>
            {placeholder || "Select an option"}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          className={`${baseInputClasses} ${errorInputClasses}`}
        />
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
