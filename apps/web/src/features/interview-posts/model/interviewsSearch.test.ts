import { describe, expect, it } from "vitest";

import {
  buildInterviewsSearchParams,
  readInterviewsSearchStateFromUrl,
} from "./interviewsSearch";

describe("interviewsSearch", () => {
  it("serializes active search state into URL params", () => {
    expect(
      buildInterviewsSearchParams({
        modeFilter: "online",
        nearbyCenter: { lat: 37.5665, lng: 126.978 },
        nearbyRadiusM: 5000,
        query: "  창업자  ",
        compensationFilter: "cash",
        postingTypeFilter: "survey",
        selectedPostId: "post-7",
      }).toString(),
    ).toBe("q=%EC%B0%BD%EC%97%85%EC%9E%90&mode=online&compensation=cash&type=survey&post=post-7&lat=37.56650&lng=126.97800&radius=5000");
  });

  it("reads valid search state from the URL and falls back for invalid values", () => {
    window.history.pushState(
      null,
      "",
      "/interviews?q=%EC%A0%9C%EC%A1%B0&mode=offline&compensation=gift_card&type=beta_test&post=post-2&lat=37.5&lng=127.1&radius=10000",
    );

    expect(readInterviewsSearchStateFromUrl()).toEqual({
      modeFilter: "offline",
      nearbyCenter: { lat: 37.5, lng: 127.1 },
      nearbyRadiusM: 10000,
      query: "제조",
      compensationFilter: "gift_card",
      postingTypeFilter: "beta_test",
      selectedPostId: "post-2",
    });

    window.history.pushState(null, "", "/interviews?mode=invalid&compensation=invalid&type=invalid&radius=42");

    expect(readInterviewsSearchStateFromUrl()).toEqual({
      modeFilter: "all",
      nearbyCenter: null,
      nearbyRadiusM: 3000,
      query: "",
      compensationFilter: "all",
      postingTypeFilter: "all",
      selectedPostId: null,
    });
  });
});
