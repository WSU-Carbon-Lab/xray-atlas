export function FieldTooltip({ description }: { description: string }) {
  return (
    <span className="group relative inline-block">
      <svg
        className="ml-1 h-4 w-4 cursor-help text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="More information"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded bg-gray-800 px-3 py-2 text-sm text-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
        {description}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  );
}
