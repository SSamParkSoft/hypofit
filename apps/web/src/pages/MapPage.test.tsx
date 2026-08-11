import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type ReactNode, type Ref } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewPost, InterviewPostView } from "../shared/api/types";
import {
  defaultRadiusM,
  defaultSearchCenter,
  mapSearchDebounceMs,
} from "../features/map/model/mapPageModel";

const mocks = vi.hoisted(() => ({
  authState: {
    accessToken: "token-123",
  },
  interviewPostParams: [] as Array<
    | {
        lat?: number;
        lng?: number;
        radiusM?: number;
        sort?: "distance";
        status: "open";
      }
    | undefined
  >,
  keywordSearch: vi.fn(),
  loadKakaoMaps: vi.fn(),
  markPostViewedMutation: {
    mutate: vi.fn(),
  },
  navigateToInterviewDetail: vi.fn(),
  postViewsQuery: {
    data: [] as InterviewPostView[],
  },
  postsQuery: {
    data: [] as InterviewPost[],
    isError: false,
    isFetching: false,
    isLoading: false,
    isPlaceholderData: false,
  },
  queryClient: {
    cancelQueries: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../features/interview-posts/useInterviewPosts", () => ({
  interviewPostQueryKeys: {
    all: ["interview-posts"] as const,
    list: (params?: unknown) => ["interview-posts", params ?? null, "api"] as const,
  },
  useInterviewPosts: (
    params?:
      | {
          lat?: number;
          lng?: number;
          radiusM?: number;
          sort?: "distance";
          status: "open";
        }
      | undefined,
  ) => {
    mocks.interviewPostParams.push(params ? { ...params } : undefined);
    return mocks.postsQuery;
  },
}));

vi.mock("../features/interview-posts/useInterviewPostViews", () => ({
  useInterviewPostViews: () => mocks.postViewsQuery,
  useMarkInterviewPostViewed: () => mocks.markPostViewedMutation,
}));

vi.mock("../shared/map/kakaoMapLoader", () => ({
  loadKakaoMaps: mocks.loadKakaoMaps,
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateToInterviewDetail: mocks.navigateToInterviewDetail,
}));

vi.mock("../features/map/components/MapSearchControls", () => ({
  MapSearchControls: (props: {
    inputRef?: Ref<HTMLInputElement>;
    isPlaceSearching: boolean;
    onQueryChange: (value: string) => void;
    onSelectPlace: (place: {
      address_name?: string;
      place_name?: string;
      road_address_name?: string;
      x: string;
      y: string;
    }) => void;
    onSubmit: () => void | Promise<void>;
    places: Array<{
      address_name?: string;
      place_name?: string;
      road_address_name?: string;
      x: string;
      y: string;
    }>;
    query: string;
    searchError: string | null;
    variant: "desktop" | "mobile";
  }) => (
    <section data-testid={`map-search-controls-${props.variant}`}>
      <label htmlFor={`map-search-query-${props.variant}`}>{props.variant} query</label>
      <input
        id={`map-search-query-${props.variant}`}
        ref={props.inputRef}
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
      />
      <button type="button" onClick={() => void props.onSubmit()}>
        {props.variant} search submit
      </button>
      {props.searchError ? <p>{props.searchError}</p> : null}
      {props.isPlaceSearching ? <p>{props.variant} searching</p> : null}
      {props.places.map((place) => (
        <button
          key={`${props.variant}-${place.place_name}-${place.x}-${place.y}`}
          type="button"
          onClick={() => props.onSelectPlace(place)}
        >
          {`${props.variant} place ${place.place_name ?? "unknown"}`}
        </button>
      ))}
    </section>
  ),
}));

vi.mock("../features/map/components/MapLocationButton", () => ({
  MapLocationButton: (props: { isRequesting: boolean; onClick: () => void }) => (
    <button type="button" onClick={props.onClick}>
      {props.isRequesting ? "current location requesting" : "current location control"}
    </button>
  ),
}));

vi.mock("../features/map/components/KakaoMapCanvas", () => ({
  KakaoMapCanvas: (props: {
    currentLocation: { lat: number; lng: number; source: "current" | "map" } | null;
    onMapViewportChange: (viewport: { lat: number; lng: number; radiusM: number }) => void;
    onSelect: (postId: string) => void;
    searchCenter: { lat: number; lng: number; source: "current" | "map" } | null;
    selectedPostId: string | null;
    views: Array<{ post: { id: string } }>;
  }) => (
    <section data-testid="map-canvas">
      <p data-testid="map-canvas-props">
        {`selected:${props.selectedPostId ?? "none"}|current:${props.currentLocation ? `${props.currentLocation.lat}/${props.currentLocation.lng}/${props.currentLocation.source}` : "none"}|center:${props.searchCenter ? `${props.searchCenter.lat}/${props.searchCenter.lng}/${props.searchCenter.source}` : "none"}`}
      </p>
      <button
        type="button"
        onClick={() =>
          props.onMapViewportChange({
            lat: 37.4994,
            lng: 127.0276,
            radiusM: 4600,
          })
        }
      >
        move map viewport
      </button>
      <button
        type="button"
        onClick={() =>
          props.onMapViewportChange({
            lat: 37.6112,
            lng: 127.0437,
            radiusM: 5200,
          })
        }
      >
        move map viewport again
      </button>
      {props.views.map((view) => (
        <button key={view.post.id} type="button" onClick={() => props.onSelect(view.post.id)}>
          {`marker select ${view.post.id}`}
        </button>
      ))}
    </section>
  ),
}));

vi.mock("../features/map/components/MapResultsPanel", () => ({
  MapResultsPanel: (props: {
    isError: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    locationStatus: "idle" | "requesting" | "granted" | "denied" | "unavailable";
    onSelect: (postId: string) => void;
    searchCenter: { lat: number; lng: number; source: "current" | "map" } | null;
    searchControls: ReactNode;
    selectedView: { post: { id: string } } | null;
    views: Array<{ post: { id: string } }>;
  }) => (
    <section data-testid="map-results-panel">
      <div data-testid="map-results-summary">
        {`loading:${String(props.isLoading)}|refreshing:${String(props.isRefreshing)}|error:${String(props.isError)}|location:${props.locationStatus}|selected:${props.selectedView?.post.id ?? "none"}|center:${props.searchCenter ? `${props.searchCenter.lat}/${props.searchCenter.lng}/${props.searchCenter.source}` : "none"}|views:${props.views.length}`}
      </div>
      {props.searchControls}
      {props.views.map((view) => (
        <button key={view.post.id} type="button" onClick={() => props.onSelect(view.post.id)}>
          {`panel select ${view.post.id}`}
        </button>
      ))}
    </section>
  ),
}));

vi.mock("../features/map/components/MobileMapSheet", () => ({
  MobileMapSheet: ({
    activeFilter,
    isError,
    isLoading,
    isRefreshing,
    onFilterChange,
    onSelect,
    onSheetHeightChange,
    onSheetLevelChange,
    sheetLevel,
    views,
  }: {
    activeFilter: "all" | "offline" | "both";
    isError: boolean;
    isLoading: boolean;
    isRefreshing: boolean;
    onFilterChange: (filter: "all" | "offline" | "both") => void;
    onSelect: (postId: string) => void;
    onSheetHeightChange: (heightPx: number) => void;
    onSheetLevelChange: (level: "collapsed" | "mid" | "expanded") => void;
    sheetLevel: "collapsed" | "mid" | "expanded";
    views: Array<{ post: { id: string } }>;
  }) => {
    useEffect(() => {
      onSheetHeightChange(sheetLevel === "expanded" ? 420 : sheetLevel === "mid" ? 280 : 96);
    }, [onSheetHeightChange, sheetLevel]);

    return (
      <section data-testid="mobile-map-sheet">
        <div data-testid="mobile-map-sheet-summary">
          {`sheet:${sheetLevel}|filter:${activeFilter}|loading:${String(isLoading)}|refreshing:${String(isRefreshing)}|error:${String(isError)}|views:${views.length}`}
        </div>
        <button type="button" onClick={() => onSheetLevelChange("expanded")}>
          expand sheet
        </button>
        <button type="button" onClick={() => onFilterChange("both")}>
          filter both
        </button>
        {views.map((view) => (
          <button key={view.post.id} type="button" onClick={() => onSelect(view.post.id)}>
            {`sheet select ${view.post.id}`}
          </button>
        ))}
      </section>
    );
  },
}));

import { MapPage } from "./MapPage";

function createPost(overrides: Partial<InterviewPost> = {}): InterviewPost {
  return {
    distance_meters: 720,
    duration_minutes: 45,
    founder: null,
    founder_id: "founder-1",
    founder_review_summary: null,
    id: "post-1",
    interview_mode: "offline",
    location: "성수역 인근",
    location_address: "서울 성동구 아차산로 100",
    location_latitude: 37.5447,
    location_longitude: 127.0557,
    location_place_name: "성수역",
    location_precision: "district",
    location_source: "kakao_place",
    location_text: "성수역",
    recruit_count: 3,
    reward_amount: 18000,
    schedule_options: ["평일 저녁"],
    service_summary: "주 1회 장보기 패턴 조사",
    status: "open",
    target_description: "최근 1개월 안에 밀키트를 구매한 경험",
    title: "가정식 밀키트 인터뷰",
    ...overrides,
  };
}

function mockGeolocationSuccess(latitude = 37.5665, longitude = 126.978) {
  const getCurrentPosition = vi.fn(
    (onSuccess: (position: { coords: { latitude: number; longitude: number } }) => void) => {
      onSuccess({
        coords: {
          latitude,
          longitude,
        },
      });
    },
  );

  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition,
    },
  });

  return getCurrentPosition;
}

function mockGeolocationError(code: number) {
  const getCurrentPosition = vi.fn(
    (
      _onSuccess: (position: GeolocationPosition) => void,
      onError?: (error: GeolocationPositionError) => void,
    ) => {
      onError?.({
        code,
        message: "permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    },
  );

  Object.defineProperty(window.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition,
    },
  });

  return getCurrentPosition;
}

function getLatestInterviewPostParams() {
  return mocks.interviewPostParams[mocks.interviewPostParams.length - 1];
}

describe("MapPage", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_KAKAO_MAP_APP_KEY", "kakao-test-key");
    mocks.authState.accessToken = "token-123";
    mocks.interviewPostParams = [];
    mocks.keywordSearch.mockReset();
    mocks.loadKakaoMaps.mockReset();
    mocks.markPostViewedMutation.mutate.mockReset();
    mocks.navigateToInterviewDetail.mockReset();
    mocks.queryClient.cancelQueries.mockReset();
    mocks.queryClient.cancelQueries.mockResolvedValue(undefined);
    mocks.postViewsQuery.data = [];
    mocks.postsQuery.data = [
      createPost(),
      createPost({
        id: "post-2",
        interview_mode: "both",
        location: "강남역 인근",
        location_address: "서울 강남구 강남대로 396",
        location_latitude: 37.4979,
        location_longitude: 127.0276,
        location_place_name: "강남역",
        location_text: "강남역",
        reward_amount: 22000,
        target_description: "협업툴을 써본 팀 리더",
        title: "B2B 협업툴 인터뷰",
      }),
    ];
    mocks.postsQuery.isError = false;
    mocks.postsQuery.isFetching = false;
    mocks.postsQuery.isLoading = false;
    mocks.postsQuery.isPlaceholderData = false;
    mocks.loadKakaoMaps.mockResolvedValue({
      maps: {
        services: {
          Places: function Places() {
            return {
              keywordSearch: mocks.keywordSearch,
            };
          },
          Status: {
            OK: "OK",
          },
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("shows the default area first and requests current location only after user action", async () => {
    const user = userEvent.setup();
    const getCurrentPosition = mockGeolocationSuccess(37.5665, 126.978);
    mocks.postsQuery.isLoading = true;

    render(<MapPage />);

    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(getLatestInterviewPostParams()).toEqual({
      lat: defaultSearchCenter.lat,
      lng: defaultSearchCenter.lng,
      radiusM: defaultRadiusM,
      sort: "distance",
      status: "open",
    });

    await user.click(screen.getByRole("button", { name: "current location control" }));

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: 37.5665,
        lng: 126.978,
        radiusM: defaultRadiusM,
        sort: "distance",
        status: "open",
      }),
    );

    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("loading:true");
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("location:granted");
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      "current:37.5665/126.978/current",
    );
  });

  it("falls back to the default search center after a denied location request and forwards query errors", async () => {
    const user = userEvent.setup();
    mockGeolocationError(1);
    mocks.postsQuery.isError = true;

    render(<MapPage />);

    await user.click(screen.getByRole("button", { name: "current location control" }));

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: defaultSearchCenter.lat,
        lng: defaultSearchCenter.lng,
        radiusM: defaultRadiusM,
        sort: "distance",
        status: "open",
      }),
    );

    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("error:true");
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("location:denied");
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      `center:${defaultSearchCenter.lat}/${defaultSearchCenter.lng}/map`,
    );
  });

  it("keeps the mobile result sheet mounted when the current area has no posts", async () => {
    mocks.postsQuery.data = [];

    render(<MapPage />);

    await waitFor(() =>
      expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("views:0"),
    );
    expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("loading:false");
    expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("error:false");
  });

  it("searches Kakao places, applies the chosen place as the new center, and clears the current selection", async () => {
    const user = userEvent.setup();
    mocks.keywordSearch.mockImplementation(
      (
        _query: string,
        callback: (
          result: Array<{
            address_name?: string;
            place_name?: string;
            road_address_name?: string;
            x: string;
            y: string;
          }>,
          status: string,
        ) => void,
      ) => {
        callback(
          [
            {
              address_name: "서울 강남구 역삼동",
              place_name: "강남역",
              road_address_name: "서울 강남구 강남대로 396",
              x: "127.0276",
              y: "37.4979",
            },
          ],
          "OK",
        );
      },
    );

    render(<MapPage />);

    await user.click(screen.getByRole("button", { name: "sheet select post-1" }));
    expect(screen.getByRole("button", { name: "상세보기" })).toBeInTheDocument();
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("selected:post-1");

    const desktopSearchControls = screen.getByTestId("map-search-controls-desktop");
    await user.type(
      within(desktopSearchControls).getByLabelText("desktop query"),
      "강남역",
    );
    await user.click(
      within(desktopSearchControls).getByRole("button", { name: "desktop search submit" }),
    );

    await waitFor(() => expect(mocks.loadKakaoMaps).toHaveBeenCalledWith("kakao-test-key"));
    expect(mocks.keywordSearch).toHaveBeenCalledWith("강남역", expect.any(Function));

    await user.click(
      within(desktopSearchControls).getByRole("button", { name: "desktop place 강남역" }),
    );

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: 37.4979,
        lng: 127.0276,
        radiusM: defaultRadiusM,
        sort: "distance",
        status: "open",
      }),
    );

    expect(screen.queryByRole("button", { name: "상세보기" })).not.toBeInTheDocument();
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("selected:none");
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      "center:37.4979/127.0276/map",
    );
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      "current:none",
    );
  });

  it("opens the sheet list, selects a post, marks it viewed, and routes detail/apply from the selected card", async () => {
    const user = userEvent.setup();

    render(<MapPage />);

    expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("sheet:collapsed");

    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("sheet:mid");

    await user.click(screen.getByRole("button", { name: "sheet select post-2" }));

    expect(mocks.markPostViewedMutation.mutate).toHaveBeenCalledWith({
      postId: "post-2",
      source: "map",
    });
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("selected:post-2");
    expect(screen.getByTestId("mobile-map-sheet-summary")).toHaveTextContent("sheet:collapsed");
    expect(screen.getByText("B2B 협업툴 인터뷰")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "상세보기" }));
    await user.click(screen.getByRole("button", { name: "신청하기" }));

    expect(mocks.navigateToInterviewDetail).toHaveBeenNthCalledWith(1, "post-2");
    expect(mocks.navigateToInterviewDetail).toHaveBeenNthCalledWith(2, "post-2", {
      apply: true,
    });
  });

  it("ignores viewport refresh while a post is selected and applies the debounced search after the selection is cleared", async () => {
    const user = userEvent.setup();

    render(<MapPage />);

    expect(getLatestInterviewPostParams()).toEqual({
      lat: defaultSearchCenter.lat,
      lng: defaultSearchCenter.lng,
      radiusM: defaultRadiusM,
      sort: "distance",
      status: "open",
    });

    await user.click(screen.getByRole("button", { name: "sheet select post-1" }));
    await user.click(screen.getByRole("button", { name: "move map viewport" }));

    expect(getLatestInterviewPostParams()).toEqual({
      lat: defaultSearchCenter.lat,
      lng: defaultSearchCenter.lng,
      radiusM: defaultRadiusM,
      sort: "distance",
      status: "open",
    });

    await user.click(screen.getByRole("button", { name: "선택한 인터뷰 닫기" }));
    await user.click(screen.getByRole("button", { name: "move map viewport" }));

    await new Promise((resolve) => window.setTimeout(resolve, mapSearchDebounceMs + 50));

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: 37.4994,
        lng: 127.0276,
        radiusM: 4600,
        sort: "distance",
        status: "open",
      }),
    );
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      "center:37.4994/127.0276/map",
    );
    expect(screen.getByTestId("map-canvas-props")).toHaveTextContent(
      "current:none",
    );
  });

  it("cancels active requests and commits only the latest viewport during rapid map movement", async () => {
    const user = userEvent.setup();

    render(<MapPage />);

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: defaultSearchCenter.lat,
        lng: defaultSearchCenter.lng,
        radiusM: defaultRadiusM,
        sort: "distance",
        status: "open",
      }),
    );

    await user.click(screen.getByRole("button", { name: "move map viewport" }));
    expect(screen.getByTestId("map-results-summary")).toHaveTextContent("refreshing:true");

    await user.click(screen.getByRole("button", { name: "move map viewport again" }));

    expect(mocks.queryClient.cancelQueries).toHaveBeenCalledTimes(2);
    expect(mocks.queryClient.cancelQueries).toHaveBeenLastCalledWith(
      {
        exact: true,
        queryKey: [
          "interview-posts",
          {
            lat: defaultSearchCenter.lat,
            lng: defaultSearchCenter.lng,
            radiusM: defaultRadiusM,
            sort: "distance",
            status: "open",
          },
          "api",
        ],
        type: "active",
      },
      { silent: true },
    );

    await new Promise((resolve) => window.setTimeout(resolve, mapSearchDebounceMs + 50));

    await waitFor(() =>
      expect(getLatestInterviewPostParams()).toEqual({
        lat: 37.6112,
        lng: 127.0437,
        radiusM: 5200,
        sort: "distance",
        status: "open",
      }),
    );
    expect(mocks.interviewPostParams).not.toContainEqual({
      lat: 37.4994,
      lng: 127.0276,
      radiusM: 4600,
      sort: "distance",
      status: "open",
    });
  });
});
