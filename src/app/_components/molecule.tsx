"use client";

import Link from "next/link";
import type { Molecule } from "~/server/db";
import React, { useState } from "react";
import Image from "next/image";
import { DialogPanel, DialogTitle, Dialog } from "@headlessui/react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";

// Updated type definitions
type SectionProps = {
  title: string;
  content: string;
  mono?: boolean;
  className?: string;
};

type InfoItemProps = {
  title: string;
  items: string[];
  mono?: boolean;
  maxItems?: number;
  truncateLength?: number;
};

type TruncatedPreviewProps = {
  content: string;
  len?: number;
  mono?: boolean;
  bold?: boolean;
};

// New NameList component
const NameList = ({
  title,
  items,
  maxItems = 2,
  truncateLength = 10,
}: InfoItemProps) => {
  const uniqueItems = Array.from(new Set(items));
  const displayedItems = uniqueItems.slice(0, maxItems);
  const hasMore = uniqueItems.length > maxItems;
  const names = displayedItems.join(", ") + (hasMore ? "..." : "");

  return (
    <div className="flex flex-col space-y-1.5">
      <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </span>
      <TruncatedPreview content={names} len={truncateLength} bold={true} />
    </div>
  );
};

// Updated TruncatedPreview component
const TruncatedPreview = ({
  content,
  len = 10,
  mono = false,
}: TruncatedPreviewProps) => (
  <div className={`text-gray-900 ${mono ? "font-mono" : ""}`}>
    {content.length > len ? `${content.slice(0, len)}...` : content}
  </div>
);

// Updated MoleculeDisplay component
export const MoleculeDisplay = (props: { molecule: Molecule }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSynonymsModal, setShowSynonymsModal] = useState(false);

  const getFullNameList = () => {
    return [props.molecule.name, ...props.molecule.synonyms];
  };

  return (
    <div className="hover:shadow-wsu-gray/50 rounded-1xl flex w-full max-w-3xl flex-col space-y-4 bg-gradient-to-r from-gray-50 to-zinc-100 p-6 shadow-lg transition-all hover:shadow-xl">
      {/* Consolidated Details Modal */}
      <Dialog
        open={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4">
          <DialogPanel className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Detailed Information
            </DialogTitle>

            <div className="mt-4 space-y-4">
              <Section
                title="Description"
                content={props.molecule.description}
              />
              <Section title="SMILES" content={props.molecule.SMILES} mono />
              <Section title="InChI" content={props.molecule.InChI} mono />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Synonyms Modal */}
      <Dialog
        open={showSynonymsModal}
        onClose={() => setShowSynonymsModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4">
          <DialogPanel className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Names and Synonyms
            </DialogTitle>

            <div className="mt-4 space-y-4">
              <Section
                title="All Names"
                content={getFullNameList().join(", ")}
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      {/* Card Content */}
      <div className="space-y-3">
        <div className="flex flex-col space-y-2">
          <div className="rounded-1xl overflow-hidden border-2 border-gray-200 bg-white p-4 shadow-inner">
            <Link
              href={`/molecule/${props.molecule.name}`}
              className="block h-full w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                className="mx-auto h-full w-full object-contain transition-transform hover:scale-105"
                src={props.molecule.img}
                alt={props.molecule.name}
                width={450}
                height={450}
                style={{ aspectRatio: "1/1" }}
              />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2.5">
            <button
              onClick={() => setShowSynonymsModal(true)}
              className="hover:ring-wsu-crimson group w-full rounded-lg bg-gray-50 p-2 text-left transition-all hover:bg-gray-100 hover:ring-1 focus:outline-none"
            >
              <NameList
                title="Common Names"
                items={getFullNameList()}
                maxItems={2}
                truncateLength={13}
              />
              <InfoItem
                title="Chemical Formula"
                content={props.molecule.chemical_formula}
                mono
              />
            </button>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => setShowDetailsModal(true)}
              className="hover:ring-wsu-crimson group w-full rounded-lg bg-gray-50 p-2 text-left transition-all hover:bg-gray-100 hover:ring-1 focus:outline-none"
            >
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {"Description"}
              </span>
              <br />
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {"SMILES"}
              </span>
              <br />
              <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                {"InChI"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Updated InfoItem component for single-line content
const InfoItem = ({
  title,
  content,
  mono = false,
}: {
  title: string;
  content: string;
  mono?: boolean;
}) => (
  <div className="flex flex-col space-y-1.5">
    <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
      {title}
    </span>
    <span className={`text-base ${mono ? "font-mono" : ""} text-gray-900`}>
      {content}
    </span>
  </div>
);

// Helper Components
const Section = ({
  title,
  content,
  mono = false,
  className = "",
}: SectionProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Ensure we're in a browser environment
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(content ?? "");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement("textarea");
        textArea.value = content ?? "";
        document.body.appendChild(textArea);
        textArea.select();
        await navigator.clipboard.writeText(content ?? "");
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={`border-b border-gray-100 pb-4 last:border-0 ${className}`}>
      <h4 className="mb-2 text-sm font-medium text-gray-500">{title}</h4>
      <div className="group relative">
        <pre
          className={`whitespace-pre-wrap break-words ${mono ? "font-mono" : ""} rounded-lg bg-gray-50 p-4 pr-10 text-sm`}
        >
          {content}
        </pre>
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleCopy}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-200"
            title="Copy to clipboard"
          >
            {copied ? (
              <span className="text-xs text-green-600">Copied!</span>
            ) : (
              <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
