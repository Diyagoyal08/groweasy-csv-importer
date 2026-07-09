import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        surface: "#FFFFFF",
        canvas: "#F1F5F9",
        muted: "#64748B",
        line: "#E2E8F0",
        brand: {
          DEFAULT: "#F2734A",
          dark: "#DC5A32",
          light: "#FDEDE5",
        },
        good: "#16A34A",
        bad: "#DC2626",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 6px -1px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
