const palette = require("./src/shared/theme/palette.json");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        hypo: { bg: palette.background, ...palette },
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
