export const THEME_STORAGE_KEY = "xray-atlas-theme";

export const THEMES = {
  light: "light",
  dark: "dark",
  system: "system",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

export const DURATION = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 500,
  slowest: 700,
} as const;

export const EASING = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
} as const;

export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  spotlight: 900,
  max: 9999,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const SPACING = {
  0: "0px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const RADIUS = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const SHADOW = {
  xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
  sm: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  glow: "0 0 20px rgba(99, 102, 241, 0.3)",
  inner: "inset 0 2px 4px rgba(0, 0, 0, 0.06)",
} as const;

export const SEMANTIC_COLORS = {
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-200",
    icon: "text-emerald-500",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-200",
    icon: "text-amber-500",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-950",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-200",
    icon: "text-red-500",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-200",
    icon: "text-blue-500",
  },
} as const;

export const INTERACTIVE_CLASSES = {
  base: "transition-all duration-200",
  hover: "hover:bg-slate-100 dark:hover:bg-slate-800",
  active: "active:scale-[0.98]",
  focus: "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  disabled: "disabled:opacity-50 disabled:pointer-events-none",
} as const;

export const CARD_CLASSES = {
  base: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl",
  elevated: "shadow-sm hover:shadow-md transition-shadow duration-200",
  interactive: "cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:-translate-y-0.5 transition-all duration-200",
  glass: "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl backdrop-saturate-150 border-white/20 dark:border-slate-700/50",
} as const;

export const BUTTON_CLASSES = {
  base: "inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  primary: "bg-accent text-white hover:bg-accent-dark active:scale-[0.98] focus-visible:ring-accent",
  secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98]",
  ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] focus-visible:ring-red-500",
  sizes: {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  },
} as const;

export const INPUT_CLASSES = {
  base: "w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150",
  error: "border-red-500 focus:ring-red-500",
} as const;
