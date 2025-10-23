"use client";

import React from "react";

interface MolecularBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function MolecularBackground({
  children,
  className = "",
}: MolecularBackgroundProps) {
  return (
    <div
      className={`relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 ${className}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute left-10 top-10 h-32 w-32 rounded-full bg-blue-200 blur-xl"></div>
        <div className="absolute right-20 top-40 h-24 w-24 rounded-full bg-indigo-200 blur-lg"></div>
        <div className="absolute bottom-20 left-1/4 h-40 w-40 rounded-full bg-purple-200 blur-2xl"></div>
        <div className="absolute bottom-40 right-1/3 h-28 w-28 rounded-full bg-cyan-200 blur-lg"></div>
        <div className="absolute left-1/2 top-1/2 h-36 w-36 rounded-full bg-violet-200 blur-xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
