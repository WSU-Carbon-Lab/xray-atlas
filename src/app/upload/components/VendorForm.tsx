"use client";

import { useState } from "react";
import { FieldTooltip } from "./FieldTooltip";

type VendorData = {
  name: string;
  url: string;
};

type VendorFormProps = {
  onSubmit: (vendor: VendorData) => void | Promise<void>;
  initialData?: Partial<VendorData>;
  submitLabel?: string;
};

export function VendorForm({
  onSubmit,
  initialData,
  submitLabel = "Save Vendor",
}: VendorFormProps) {
  const [vendor, setVendor] = useState<VendorData>({
    name: "",
    url: "",
    ...initialData,
  });

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(vendor);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Add Vendor</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              Name
              <FieldTooltip description="The name of the vendor or supplier from which the sample was obtained" />
            </span>
            <input
              required
              className="rounded border p-2"
              value={vendor.name}
              onChange={(e) => setVendor({ ...vendor, name: e.target.value })}
              title="The name of the vendor or supplier from which the sample was obtained"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="flex items-center">
              URL (optional)
              <FieldTooltip description="Website URL or catalog link for the vendor" />
            </span>
            <input
              className="rounded border p-2"
              value={vendor.url}
              onChange={(e) => setVendor({ ...vendor, url: e.target.value })}
              title="Website URL or catalog link for the vendor"
            />
          </label>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
