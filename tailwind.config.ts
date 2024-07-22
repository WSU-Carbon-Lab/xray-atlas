import { type Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["zed"],
        thin: ["zed-thin"],
        light: ["zed-thin"],
        mono: ["zed-mono"],
      },
    },
  },
  plugins: [],
} satisfies Config;
