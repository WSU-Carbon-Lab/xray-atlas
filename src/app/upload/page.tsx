import React from "react";
import { DataUploadForm } from "~/app/_components/data-upload-form";

export const metadata = {
  title: "Upload Data | Xray Atlas",
  description: "Upload your X-ray spectroscopy data to the Xray Atlas database",
};

export default function UploadPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-center font-thin text-3xl">
        Upload Data to X-ray Atlas
      </h1>
      <DataUploadForm />
    </div>
  );
}
