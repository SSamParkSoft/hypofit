export type MapSheetLevel = "hidden" | "mid" | "max";

export interface MapSheetHeights {
  hidden: number;
  mid: number;
  max: number;
}

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
  const mid = clamp(Math.round(availableHeight * 0.52), 252, availableHeight - 200);
  const max = clamp(Math.round(availableHeight * 0.78), mid + sheetLevelGapPx, availableHeight - sheetTopGapPx);

  return { hidden: 0, mid, max };
}

export function clampMapSheetHeight(height: number, heights: MapSheetHeights) {
  return Math.max(heights.hidden, Math.min(height, heights.max));
}

export function getNearestMapSheetLevel(height: number, heights: MapSheetHeights): MapSheetLevel {
  const candidates: Array<[MapSheetLevel, number]> = [
    ["hidden", Math.abs(height - heights.hidden)],
    ["mid", Math.abs(height - heights.mid)],
    ["max", Math.abs(height - heights.max)],
  ];

  return candidates.sort((left, right) => left[1] - right[1])[0][0];
}

export function getCycleMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "hidden") {
    return "mid";
  }

  if (level === "mid") {
    return "max";
  }

  return "mid";
}

export function getHigherMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "hidden") {
    return "mid";
  }

  return "max";
}

export function getLowerMapSheetLevel(level: MapSheetLevel): MapSheetLevel {
  if (level === "max") {
    return "mid";
  }

  if (level === "mid") {
    return "hidden";
  }

  return "hidden";
}
