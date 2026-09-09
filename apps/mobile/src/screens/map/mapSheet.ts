export type MapSheetLevel = "min" | "compact" | "mid" | "max";

export interface MapSheetHeights {
  min: number;
  compact: number;
  mid: number;
  max: number;
}

const minimumSheetHeightPx = 126;
const maximumMinSheetHeightPx = 156;
const compactSheetRatio = 0.42;
const sheetLevelGapPx = 96;
const sheetTopGapPx = 72;

function clamp(value: number, lower: number, upper: number) {
  if (upper < lower) {
    return lower;
  }

  return Math.max(lower, Math.min(value, upper));
}

export function getMapSheetHeights(viewportHeight: number): MapSheetHeights {
  const availableHeight = Math.max(viewportHeight, 600);
  const min = clamp(Math.round(availableHeight * 0.16), minimumSheetHeightPx, maximumMinSheetHeightPx);
  const compact = clamp(Math.round(availableHeight * compactSheetRatio), min + sheetLevelGapPx, availableHeight - 260);
  const mid = clamp(Math.round(availableHeight * 0.52), compact + 64, availableHeight - 200);
  const max = clamp(Math.round(availableHeight * 0.78), mid + sheetLevelGapPx, availableHeight - sheetTopGapPx);

  return { min, compact, mid, max };
}

export function clampMapSheetHeight(height: number, heights: MapSheetHeights) {
  return Math.max(heights.min, Math.min(height, heights.max));
}

export function getNearestMapSheetLevel(height: number, heights: MapSheetHeights): MapSheetLevel {
  const candidates: Array<[MapSheetLevel, number]> = [
    ["min", Math.abs(height - heights.min)],
    ["compact", Math.abs(height - heights.compact)],
    ["mid", Math.abs(height - heights.mid)],
    ["max", Math.abs(height - heights.max)],
  ];

  return candidates.sort((left, right) => left[1] - right[1])[0][0];
}

export function getCycleMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "min") {
    return "compact";
  }

  if (level === "compact") {
    return "mid";
  }

  if (level === "mid") {
    return "max";
  }

  return "min";
}

export function getHigherMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "min") {
    return "compact";
  }

  if (level === "compact") {
    return "mid";
  }

  return "max";
}

export function getLowerMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "max") {
    return "mid";
  }

  if (level === "mid") {
    return "compact";
  }

  return "min";
}

export function formatMapDistance(distanceMeters: number | null, fallback = "") {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) {
    return fallback;
  }

  if (distanceMeters < 1000) {
    return `${Math.max(1, Math.round(distanceMeters))}m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10000 ? 1 : 0)}km`;
}
