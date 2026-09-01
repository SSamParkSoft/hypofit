/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        hypo: {
          bg: "#F6F7F8",
          surface: "#FFFFFF",
          surfaceMuted: "#F0F3F1",
          "surface-muted": "#F0F3F1",
          text: "#18211C",
          textSecondary: "#5F6B64",
          "text-secondary": "#5F6B64",
          textMetadata: "#69736D",
          "text-metadata": "#69736D",
          "text-muted": "#657069",
          "text-soft": "#87918B",
          "text-tertiary": "#87918B",
          muted: "#657069",
          soft: "#87918B",
          border: "#DCE4DF",
          brand: "#0F7A4D",
          brandStrong: "#0B5C3A",
          "brand-strong": "#0B5C3A",
          brandSoft: "#E8F4EC",
          "brand-soft": "#E8F4EC",
          accent: "#B7FF5A",
          danger: "#B91C1C",
          dangerSoft: "#FEF2F2",
          "danger-soft": "#FEF2F2",
        },
      },
      fontFamily: {
        sans: ["HypofitSansRegular"],
        light: ["HypofitSansRegular"],
        medium: ["HypofitSansMedium"],
        bold: ["HypofitSansBold"],
      },
      borderRadius: {
        hypo: "14px",
      },
    },
  },
  plugins: [],
};
