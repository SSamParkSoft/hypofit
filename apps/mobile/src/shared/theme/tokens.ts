import palette from "./palette.json";

export const colors = palette;

export const typography = {
  fontFamily: {
    light: "HypofitSansRegular",
    medium: "HypofitSansMedium",
    bold: "HypofitSansBold",
  },
  size: {
    screenTitle: 24,
    sectionTitle: 21,
    rowTitle: 16,
    body: 15,
    metadata: 13,
    tertiary: 12,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  control: 12,
  panel: 16,
  sheet: 24,
} as const;

export const motion = {
  quick: 120,
  standard: 180,
  sheet: 220,
} as const;
