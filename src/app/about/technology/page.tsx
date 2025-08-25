import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Technology",
  description: "The technology stack behind the Xray Atlas.",
};

const TechnologyPage = () => {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Technology Stack</h1>
      <p className="mb-6 text-lg">
        The Xray Atlas is built on a modern, robust technology stack to ensure a
        high-quality user experience and long-term maintainability.
      </p>

      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Next.js:</strong> A React framework for building fast,
          server-rendered web applications.
        </li>
        <li>
          <strong>TypeScript:</strong> For type safety and improved developer
          experience.
        </li>
        <li>
          <strong>Tailwind CSS:</strong> A utility-first CSS framework for rapid
          UI development.
        </li>
        <li>
          <strong>Drizzle ORM &amp; Turso:</strong> For our database, providing
          a reliable and scalable solution for our data storage needs.
        </li>
        <li>
          <strong>shadcn/ui:</strong> A collection of reusable components that
          help us build a consistent and accessible user interface.
        </li>
      </ul>
    </div>
  );
};

export default TechnologyPage;
