/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Phaenatics brand — black base, cream type, forest accents
        bg: "#000000",
        panel: "#0f1613",
        panel2: "#131a16",
        line: "#243029",
        fg: "#f2e8d0", // cream
        muted: "#8a9a90",
        cream: {
          DEFAULT: "#f2e8d0",
          600: "#d9ce9f",
        },
        forest: {
          900: "#0d2a1e",
          800: "#143526",
          700: "#1a4535",
          600: "#2a5a47",
        },
        leaf: {
          DEFAULT: "#8dd4a8",
          600: "#6ec289",
          700: "#4fa06b",
          900: "#1f3d2a",
        },
        warn: "#f5a524",
        danger: "#ef4444",
        info: "#7ec8e3",
      },
      boxShadow: {
        soft: "0 1px 0 0 rgba(242,232,208,0.04) inset, 0 4px 24px -8px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(141,212,168,0.22), 0 0 24px -6px rgba(141,212,168,0.4)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Fraunces",
          "Playfair Display",
          "ui-serif",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
