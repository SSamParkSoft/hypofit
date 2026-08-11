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
          surfaceMuted: "#F1EEE6",
          "surface-muted": "#F1EEE6",
          text: "#1D2522",
          "text-muted": "#66706B",
          "text-soft": "#69716C",
          muted: "#66706B",
          soft: "#69716C",
          border: "#DEDBD2",
          brand: "#176B5D",
          brandStrong: "#0F4F44",
          "brand-strong": "#0F4F44",
          brandSoft: "#E7F1EE",
          "brand-soft": "#E7F1EE",
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
