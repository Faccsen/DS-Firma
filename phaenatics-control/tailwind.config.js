/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0f0d",
        panel: "#111613",
        panel2: "#161d19",
        line: "#1f2823",
        fg: "#e8efe9",
        muted: "#7a8a82",
        leaf: {
          DEFAULT: "#3ddc84",
          600: "#2dbf6e",
          700: "#1f9a56",
          900: "#0d3e25",
        },
        warn: "#f5a524",
        danger: "#ef4444",
        info: "#38bdf8",
      },
      boxShadow: {
        soft: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 4px 24px -8px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(61,220,132,0.18), 0 0 24px -6px rgba(61,220,132,0.35)",
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
      },
    },
  },
  plugins: [],
};
