import { type Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["zed", ...defaultTheme.fontFamily.sans],
        thin: ["zed-thin"],
        light: ["zed-thin"],
        mono: ["zed-mono", ...defaultTheme.fontFamily.mono],
      },
    },
  },
  plugins: [],
} satisfies Config;
