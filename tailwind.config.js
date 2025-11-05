// tailwind.config.js (ESM)
import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/components/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        "wsu-crimson": "#a60f2d",
        "wsu-gray": "#5e6a71",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
