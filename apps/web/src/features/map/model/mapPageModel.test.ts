import { describe, expect, it } from "vitest";

import type { InterviewPost } from "../../../shared/api/types";
import {
  buildMapPostViews,
  clampSheetHeight,
  defaultRadiusM,
  defaultSearchCenter,
  formatMapDistance,
  getMapCameraSyncPlan,
  getDisplaySheetLevel,
  getRadiusFromBounds,
  getSettledSheetHeightAfterDrag,
  getSheetHeights,
  isKoreaCoordinate,
  isSameMapSearch,
  sheetMinHeightPx,
} from "./mapPageModel";

function createInterviewPost(overrides: Partial<InterviewPost> = {}): InterviewPost {
  return {
    id: "post-1",
    founder_id: "founder-1",
    founder: null,
    founder_review_summary: null,
    title: "가정식 밀키트 인터뷰",
    service_summary: "주 1회 장보기 패턴 조사",
    target_description: "최근 1개월 안에 밀키트를 구매한 경험",
    reward_amount: 18000,
    duration_minutes: 45,
    recruit_count: 3,
    interview_mode: "offline",
    location: "성수역 인근",
    location_text: null,
    location_address: null,
    location_place_name: null,
    location_latitude: 37.5447,
    location_longitude: 127.0557,
    location_precision: "district",
    location_source: "kakao_place",
    distance_meters: 620,
    schedule_options: ["평일 저녁"],
    status: "open",
    ...overrides,
  };
}

describe("mapPageModel", () => {
  it("builds map post views from coordinate-backed offline-capable posts", () => {
    const posts = [
      createInterviewPost(),
      createInterviewPost({
        id: "post-2",
        interview_mode: "both",
        distance_meters: 2100,
        location_text: "강남역 또는 화상",
      }),
      createInterviewPost({
        id: "post-3",
        interview_mode: "online",
      }),
      createInterviewPost({
        id: "post-4",
        location_latitude: null,
        location_longitude: null,
      }),
    ];

    expect(buildMapPostViews(posts, "all").map((view) => view.post.id)).toEqual([
      "post-1",
      "post-2",
    ]);
    expect(buildMapPostViews(posts, "offline").map((view) => view.post.id)).toEqual(["post-1"]);
    expect(buildMapPostViews(posts, "both").map((view) => view.post.id)).toEqual(["post-2"]);

    expect(buildMapPostViews(posts, "both")[0]).toMatchObject({
      area: "강남역",
      distance: "2.1km",
    });
  });

  it("formats distance and recognizes Korea coordinates", () => {
    expect(formatMapDistance(950, "거리 확인 전")).toBe("950m");
    expect(formatMapDistance(2400, "거리 확인 전")).toBe("2.4km");
    expect(formatMapDistance(null, "거리 확인 전")).toBe("거리 확인 전");

    expect(isKoreaCoordinate({ lat: 37.5665, lng: 126.978 })).toBe(true);
    expect(isKoreaCoordinate({ lat: 51.5072, lng: -0.1276 })).toBe(false);
  });

  it("treats nearby viewport updates as the same map search", () => {
    expect(
      isSameMapSearch(defaultSearchCenter, defaultRadiusM, {
        lat: defaultSearchCenter.lat + 0.0001,
        lng: defaultSearchCenter.lng + 0.0001,
        radiusM: defaultRadiusM + 50,
      }),
    ).toBe(true);

    expect(
      isSameMapSearch(defaultSearchCenter, defaultRadiusM, {
        lat: defaultSearchCenter.lat + 0.01,
        lng: defaultSearchCenter.lng,
        radiusM: defaultRadiusM,
      }),
    ).toBe(false);

    expect(
      isSameMapSearch(defaultSearchCenter, defaultRadiusM, {
        lat: defaultSearchCenter.lat,
        lng: defaultSearchCenter.lng,
        radiusM: defaultRadiusM + 500,
      }),
    ).toBe(false);
  });

  it("derives a bounded search radius from map bounds", () => {
    const center = {
      getLat: () => 37.5665,
      getLng: () => 126.978,
    };
    const tightBounds = {
      getNorthEast: () => ({
        getLat: () => 37.5675,
        getLng: () => 126.979,
      }),
      getSouthWest: () => ({
        getLat: () => 37.5655,
        getLng: () => 126.977,
      }),
    };
    const wideBounds = {
      getNorthEast: () => ({
        getLat: () => 38.3665,
        getLng: () => 127.778,
      }),
      getSouthWest: () => ({
        getLat: () => 36.7665,
        getLng: () => 126.178,
      }),
    };

    expect(getRadiusFromBounds(center, tightBounds)).toBeGreaterThanOrEqual(800);
    expect(getRadiusFromBounds(center, wideBounds)).toBeLessThanOrEqual(20000);
  });

  it("does not reapply the map camera after a user-driven zoom reports the same center", () => {
    expect(
      getMapCameraSyncPlan(
        { lat: 37.5665, lng: 126.978 },
        { lat: 37.5665, lng: 126.978 },
        null,
        null,
      ),
    ).toEqual({
      shouldMoveCenter: false,
      shouldSetLevel: false,
    });

    expect(
      getMapCameraSyncPlan(
        { lat: 37.5665, lng: 126.978 },
        { lat: 37.4979, lng: 127.0276 },
        null,
        null,
      ),
    ).toEqual({
      shouldMoveCenter: true,
      shouldSetLevel: true,
    });

    expect(
      getMapCameraSyncPlan(
        { lat: 37.5665, lng: 126.978 },
        { lat: 37.5665, lng: 126.978 },
        null,
        "post-1",
      ),
    ).toEqual({
      shouldMoveCenter: false,
      shouldSetLevel: true,
    });
  });

  it("computes sheet heights and snap behavior from the available viewport", () => {
    const sheetHeights = getSheetHeights(720);
    const midLevelHeight = (sheetHeights.collapsed + sheetHeights.expanded) / 2;

    expect(sheetHeights.collapsed).toBe(sheetMinHeightPx);
    expect(sheetHeights.mid).toBeGreaterThan(sheetHeights.collapsed);
    expect(sheetHeights.expanded).toBeGreaterThan(sheetHeights.mid);
    expect(clampSheetHeight(9999, sheetHeights)).toBe(sheetHeights.expanded);
    expect(clampSheetHeight(40, sheetHeights)).toBe(sheetHeights.collapsed);

    expect(getSettledSheetHeightAfterDrag(sheetHeights.collapsed + 12, -40, sheetHeights)).toBe(
      sheetHeights.mid,
    );
    expect(getSettledSheetHeightAfterDrag(sheetHeights.mid + 24, -50, sheetHeights)).toBe(
      sheetHeights.expanded,
    );
    expect(getDisplaySheetLevel(sheetHeights.collapsed + 8, sheetHeights)).toBe("collapsed");
    expect(getDisplaySheetLevel(midLevelHeight, sheetHeights)).toBe("mid");
    expect(getDisplaySheetLevel(sheetHeights.expanded, sheetHeights)).toBe("expanded");
  });
});
