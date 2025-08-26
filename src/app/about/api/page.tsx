import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Reference Guide",
  description: "Comprehensive guide to the Xray Atlas API.",
};

const ApiPage = () => {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">API Reference Guide</h1>
      <p className="mb-6 text-lg">
        The Xray Atlas API provides programmatic access to the features and data
        of the Xray Atlas. This guide will help you understand how to use the
        API effectively.
      </p>
    </div>
  );
};

export default ApiPage;
