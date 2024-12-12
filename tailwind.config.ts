import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    fontFamily: {
      sans: ["zed", ...defaultTheme.fontFamily.sans],
      thin: ["zed-thin"],
      light: ["zed-thin"],
      mono: ["zed-mono", ...defaultTheme.fontFamily.mono],
    },
    fontSize: {
      xs: "0.6rem",
      sm: "0.75rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem",
      "6xl": "4rem",
    },
  },
  plugins: [],
} satisfies Config;
