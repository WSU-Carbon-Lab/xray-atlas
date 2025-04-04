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
    extend: {
      colors: {
        // WSU Primary Colors
        "wsu-crimson": "#C8102E",
        "wsu-gray": "#5E6A71",

        // WSU Secondary Colors
        "wsu-orange": "#F1662A",
        "wsu-green": "#8ABE4F",
        "wsu-blue": "#00A5BD",
        "wsu-yellow": "#FFCD00",

        // Alias for existing crimson usage
        crimson: "#C8102E",
      },
      spacing: {
        4.5: "1.125rem",
        18: "4.5rem",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      scale: {
        105: "1.05",
      },
    },
    container: {
      center: true,
      padding: "2rem",
    },
  },
  plugins: [],
} satisfies Config;
