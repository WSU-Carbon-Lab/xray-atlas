import { heroui } from "@heroui/theme";

const heroUiTheme = {
  themes: {
    light: {
      colors: {
        default: { 50: "#fafafa", 100: "#f2f2f3", 200: "#ebebec", 300: "#e3e3e6", 400: "#dcdcdf", 500: "#d4d4d8", 600: "#afafb2", 700: "#8a8a8c", 800: "#656567", 900: "#404041", foreground: "#000", DEFAULT: "#d4d4d8" },
        primary: { 50: "#dfedfd", 100: "#b3d4fa", 200: "#86bbf7", 300: "#59a1f4", 400: "#2d88f1", 500: "#006fee", 600: "#005cc4", 700: "#00489b", 800: "#003571", 900: "#002147", foreground: "#fff", DEFAULT: "#006fee" },
        secondary: { 50: "#eee4f8", 100: "#d7bfef", 200: "#bf99e5", 300: "#a773db", 400: "#904ed2", 500: "#7828c8", 600: "#6321a5", 700: "#4e1a82", 800: "#39135f", 900: "#240c3c", foreground: "#fff", DEFAULT: "#7828c8" },
        success: { 50: "#e2f8ec", 100: "#b9efd1", 200: "#91e5b5", 300: "#68dc9a", 400: "#40d27f", 500: "#17c964", 600: "#13a653", 700: "#0f8341", 800: "#0b5f30", 900: "#073c1e", foreground: "#000", DEFAULT: "#17c964" },
        warning: { 50: "#fef4e4", 100: "#fce4bd", 200: "#fad497", 300: "#f9c571", 400: "#f7b54a", 500: "#f5a524", 600: "#ca881e", 700: "#9f6b17", 800: "#744e11", 900: "#4a320b", foreground: "#000", DEFAULT: "#f5a524" },
        danger: { 50: "#fee1eb", 100: "#fbb8cf", 200: "#f98eb3", 300: "#f76598", 400: "#f53b7c", 500: "#f31260", 600: "#c80f4f", 700: "#9e0c3e", 800: "#73092e", 900: "#49051d", foreground: "#000", DEFAULT: "#f31260" },
        background: "#ffffff",
        foreground: "#000000",
        content1: { DEFAULT: "#ffffff", foreground: "#000" },
        content2: { DEFAULT: "#f4f4f5", foreground: "#000" },
        content3: { DEFAULT: "#e4e4e7", foreground: "#000" },
        content4: { DEFAULT: "#d4d4d8", foreground: "#000" },
        focus: "#006FEE",
        overlay: "#ffffff",
      },
    },
    dark: {
      colors: {
        default: { 50: "#151313", 100: "#2a2626", 200: "#3e3a3a", 300: "#534d4d", 400: "#686060", 500: "#868080", 600: "#a4a0a0", 700: "#c3bfbf", 800: "#e1dfdf", 900: "#ffffff", foreground: "#fff", DEFAULT: "#686060" },
        primary: { 50: "#002147", 100: "#003571", 200: "#00489b", 300: "#005cc4", 400: "#006fee", 500: "#2d88f1", 600: "#59a1f4", 700: "#86bbf7", 800: "#b3d4fa", 900: "#dfedfd", foreground: "#fff", DEFAULT: "#006fee" },
        secondary: { 50: "#240c3c", 100: "#39135f", 200: "#4e1a82", 300: "#6321a5", 400: "#7828c8", 500: "#904ed2", 600: "#a773db", 700: "#bf99e5", 800: "#d7bfef", 900: "#eee4f8", foreground: "#fff", DEFAULT: "#7828c8" },
        success: { 50: "#073c1e", 100: "#0b5f30", 200: "#0f8341", 300: "#13a653", 400: "#17c964", 500: "#40d27f", 600: "#68dc9a", 700: "#91e5b5", 800: "#b9efd1", 900: "#e2f8ec", foreground: "#000", DEFAULT: "#17c964" },
        warning: { 50: "#4a320b", 100: "#744e11", 200: "#9f6b17", 300: "#ca881e", 400: "#f5a524", 500: "#f7b54a", 600: "#f9c571", 700: "#fad497", 800: "#fce4bd", 900: "#fef4e4", foreground: "#000", DEFAULT: "#f5a524" },
        danger: { 50: "#49051d", 100: "#73092e", 200: "#9e0c3e", 300: "#c80f4f", 400: "#f31260", 500: "#f53b7c", 600: "#f76598", 700: "#f98eb3", 800: "#fbb8cf", 900: "#fee1eb", foreground: "#000", DEFAULT: "#f31260" },
        background: "#000000",
        foreground: "#ffffff",
        content1: { DEFAULT: "#18181b", foreground: "#fff" },
        content2: { DEFAULT: "#27272a", foreground: "#fff" },
        content3: { DEFAULT: "#3f3f46", foreground: "#fff" },
        content4: { DEFAULT: "#52525b", foreground: "#fff" },
        focus: "#006FEE",
        overlay: "#000000",
      },
    },
  },
  layout: { disabledOpacity: "0.4" },
};

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/components/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        "wsu-crimson": {
          DEFAULT: "#a60f2d",
          light: "#a60f2d",
          dark: "#ca1237",
        },
        "wsu-gray": "#5e6a71",
        accent: {
          DEFAULT: "#6366f1",
          light: "#818cf8",
          dark: "#4f46e5",
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        success: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
        },
        warning: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          dark: "#d97706",
        },
        error: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
        info: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          dark: "#2563eb",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "JetBrains Mono", "Fira Code", "monospace"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(99, 102, 241, 0.3)",
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.2)",
        "glow-lg": "0 0 30px rgba(99, 102, 241, 0.4)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in forwards",
        "slide-in-up": "slide-in-up 0.3s ease-out",
        "slide-in-down": "slide-in-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        border: "border 4s linear infinite",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        border: {
          to: { "--border-angle": "360deg" },
        },
      },
      zIndex: {
        dropdown: "100",
        sticky: "200",
        fixed: "300",
        "modal-backdrop": "400",
        modal: "500",
        popover: "600",
        tooltip: "700",
        toast: "800",
        spotlight: "900",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [heroui(heroUiTheme)],
};

export default config;
