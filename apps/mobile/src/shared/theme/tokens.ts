export const colors = {
  background: "#F6F7F8",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F3F1",
  "surface-muted": "#F0F3F1",
  text: "#18211C",
  textSecondary: "#5F6B64",
  "text-secondary": "#5F6B64",
  textMetadata: "#69736D",
  "text-metadata": "#69736D",
  textMuted: "#657069",
  "text-muted": "#657069",
  textSoft: "#87918B",
  "text-soft": "#87918B",
  textTertiary: "#87918B",
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
};

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
