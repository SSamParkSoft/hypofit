import assert from "node:assert/strict";
import { test } from "node:test";
import {
  floatingTabBar,
  getFloatingTabBarMaterial,
  getBottomTabBarHeight,
  getBottomTabBarHideDistance,
  getBottomTabBarStyle,
  getBottomTabItemStyle,
  getHiddenBottomTabBarStyle,
} from "../src/shared/navigation/tabBarStyle.ts";
import {
  clampMapSheetHeight,
  getCycleMapSheetLevel,
  getHigherMapSheetLevel,
  getLowerMapSheetLevel,
  getMapSheetHeights,
  getNearestMapSheetLevel,
} from "../src/screens/map/mapSheet.ts";
import {
  getPostsInMapRegion,
  hasMeaningfulRegionChange,
} from "../src/screens/map/mapViewport.ts";
import {
  createTabBarScrollTracker,
  emitTabBarVisibility,
  shouldHideTabBar,
  subscribeTabBarVisibility,
} from "../src/shared/navigation/tabBarScroll.ts";

test("map list only includes posts inside the current viewport, not the search radius", () => {
  const region = { latitude: 37, longitude: 127, latitudeDelta: 2, longitudeDelta: 2 };
  const posts = [
    { id: "center", location_latitude: 37, location_longitude: 127 },
    { id: "north", location_latitude: 38.1, location_longitude: 127 },
    { id: "south", location_latitude: 35.9, location_longitude: 127 },
    { id: "east", location_latitude: 37, location_longitude: 128.1 },
    { id: "west", location_latitude: 37, location_longitude: 125.9 },
    { id: "edge", location_latitude: 38, location_longitude: 128 },
    { id: "same-location", location_latitude: 37, location_longitude: 127 },
  ];
  assert.deepEqual(getPostsInMapRegion(posts, region).map((post) => post.id), ["center", "edge", "same-location"]);
  assert.equal(getPostsInMapRegion(posts, { ...region, latitude: 40 }).length, 0);
  assert.deepEqual(getPostsInMapRegion(posts, { ...region, latitudeDelta: 0.1, longitudeDelta: 0.1 })
    .map((post) => post.id), ["center", "same-location"]);
  assert.equal(getPostsInMapRegion(posts, { ...region, latitudeDelta: 4, longitudeDelta: 4 }).length, 7);
});

test("map viewport longitude bounds wrap across the date line", () => {
  const region = { latitude: 0, longitude: 179, latitudeDelta: 2, longitudeDelta: 4 };
  const posts = [
    { location_latitude: 0, location_longitude: -180 },
    { location_latitude: 0, location_longitude: -178 },
  ];
  assert.deepEqual(getPostsInMapRegion(posts, region), [posts[0]]);
});

const settledMapRegion = {
  latitude: 37.296513,
  longitude: 126.8370800000001,
  latitudeDelta: 0.05374202465924327,
  longitudeDelta: 0.03490717042704716,
};

test("native aspect-ratio normalization differs from a requested square region", () => {
  const requested = { ...settledMapRegion, latitudeDelta: 0.035, longitudeDelta: 0.035 };
  assert.equal(hasMeaningfulRegionChange(settledMapRegion, requested), true);
  assert.equal(hasMeaningfulRegionChange({ ...settledMapRegion }, settledMapRegion), false);
});

test("minor native coordinate rounding does not require another map search", () => {
  assert.equal(hasMeaningfulRegionChange({
    ...settledMapRegion,
    longitude: 126.83708,
    latitude: settledMapRegion.latitude + 0.00001,
  }, settledMapRegion), false);
});

test("meaningful manual pan and zoom still require explicit map search", () => {
  assert.equal(hasMeaningfulRegionChange({
    ...settledMapRegion,
    latitude: settledMapRegion.latitude + 0.02,
  }, settledMapRegion), true);
  for (const scale of [0.7, 1.3]) {
    assert.equal(hasMeaningfulRegionChange({
      ...settledMapRegion,
      latitudeDelta: settledMapRegion.latitudeDelta * scale,
      longitudeDelta: settledMapRegion.longitudeDelta * scale,
    }, settledMapRegion), true);
  }
});

test("posting navigation hides after downward travel and returns sooner on upward travel", () => {
  const track = createTabBarScrollTracker();
  assert.equal(track(10, 500), undefined);
  assert.equal(track(23, 500), undefined);
  assert.equal(track(24, 500), false);
  assert.equal(track(100, 500), undefined);
  assert.equal(track(89, 500), undefined);
  assert.equal(track(88, 500), true);
});

test("small alternating scrolls do not toggle navigation", () => {
  const track = createTabBarScrollTracker(100);
  for (const offset of [105, 101, 108, 102, 110, 100]) {
    assert.equal(track(offset, 500), undefined);
  }
});

test("top edge reveals navigation and short content cannot hide it", () => {
  const track = createTabBarScrollTracker();
  assert.equal(track(80, 500), false);
  assert.equal(track(8, 500), true);
  for (const offset of [-60, 0, 100]) assert.equal(track(offset, 0), undefined);
});

test("bottom overscroll and bounce do not reveal hidden navigation", () => {
  const track = createTabBarScrollTracker();
  assert.equal(track(500, 500), false);
  assert.equal(track(560, 500), undefined);
  assert.equal(track(500, 500), undefined);
  assert.equal(track(488, 500), true);
});

test("refocused scrolled list starts with visible navigation and a fresh baseline", () => {
  const track = createTabBarScrollTracker(300);
  assert.equal(track(300, 500), undefined);
  assert.equal(track(310, 500), undefined);
  assert.equal(track(324, 500), false);
});

test("scrolling primary tab roots may hide navigation; screen readers retain navigation", () => {
  for (const path of ["/interviews", "/chat", "/profile"]) {
    assert.equal(shouldHideTabBar(path, false, false), true);
  }
  assert.equal(shouldHideTabBar("/interviews", true, false), false);
  assert.equal(shouldHideTabBar("/interviews", false, true), false);
  for (const path of ["/map", "/chat/123", "/profile/account", "/interviews/my-interviews", "/interviews/123"]) {
    assert.equal(shouldHideTabBar(path, false, false), false);
  }
});

test("posting visibility subscriptions clean up", () => {
  const received = [];
  const unsubscribe = subscribeTabBarVisibility((visible) => received.push(visible));
  emitTabBarVisibility(false);
  emitTabBarVisibility(true);
  unsubscribe();
  emitTabBarVisibility(false);
  assert.deepEqual(received, [false, true]);
});

test("supported iOS uses native glass without changing tab geometry", () => {
  assert.equal(getFloatingTabBarMaterial({
    platform: "ios", reduceTransparency: false, liquidGlassAvailable: true,
  }), "liquidGlass");
});

test("iOS without the compiled glass API retains blur", () => {
  assert.equal(getFloatingTabBarMaterial({
    platform: "ios", reduceTransparency: false, liquidGlassAvailable: false,
  }), "blur");
});

test("Reduce Transparency overrides both glass and blur", () => {
  for (const liquidGlassAvailable of [false, true]) {
    assert.equal(getFloatingTabBarMaterial({
      platform: "ios", reduceTransparency: true, liquidGlassAvailable,
    }), "solid");
  }
});

test("Android and web retain a readable opaque surface", () => {
  for (const platform of ["android", "web"]) {
    for (const liquidGlassAvailable of [false, true]) {
      assert.equal(getFloatingTabBarMaterial({
        platform, reduceTransparency: false, liquidGlassAvailable,
      }), "solid");
    }
  }
});

for (const bottomInset of [0, 16, 24, 34, 48]) {
  test(`hide translation clears the bar and shadow with bottom inset ${bottomInset}`, () => {
    const style = getBottomTabBarStyle(bottomInset);
    const translatedTop = -style.bottom - style.height + getBottomTabBarHideDistance(bottomInset);
    assert.equal(translatedTop, 16);
    assert.ok(getBottomTabBarHideDistance(bottomInset) > getBottomTabBarHeight(bottomInset));
  });
  test(`floating bar and content reserve agree with bottom inset ${bottomInset}`, () => {
    const style = getBottomTabBarStyle(bottomInset);
    assert.equal(style.position, "absolute");
    assert.equal(style.bottom, Math.max(bottomInset, floatingTabBar.minimumBottomOffset));
    assert.equal(style.height, floatingTabBar.height);
    assert.equal(getBottomTabBarHeight(bottomInset), style.height + style.bottom);
    assert.ok(getBottomTabItemStyle().height >= 48);
    assert.ok(getBottomTabItemStyle().height + style.paddingTop + style.paddingBottom <= style.height);
  });
}

test("four tab targets fit at small phone widths", () => {
  const style = getBottomTabBarStyle(0);
  for (const width of [320, 375, 393, 440]) {
    const itemWidth = (width - style.start - style.end - 2 * style.paddingHorizontal) / 4;
    assert.ok(itemWidth >= 48, `tab target at ${width}px`);
  }
});

test("logical insets override React Navigation's full-width defaults", () => {
  const style = { start: 0, end: 0, ...getBottomTabBarStyle(34) };
  assert.equal(style.start, 16);
  assert.equal(style.end, 16);
});

test("map starts closed and its two open heights leave room for navigation", () => {
  for (const viewportHeight of [568, 667, 852, 874, 956]) {
    const { hidden, mid, max } = getMapSheetHeights(viewportHeight);
    assert.equal(hidden, 0);
    assert.ok(hidden < mid && mid < max);
    assert.ok(max + getBottomTabBarHeight(34) <= viewportHeight);
  }
});

test("map header toggles open heights; dragging down can close the sheet", () => {
  assert.equal(getCycleMapSheetLevel("hidden"), "mid");
  assert.equal(getCycleMapSheetLevel("mid"), "max");
  assert.equal(getCycleMapSheetLevel("max"), "mid");
  assert.equal(getHigherMapSheetLevel("hidden"), "mid");
  assert.equal(getHigherMapSheetLevel("mid"), "max");
  assert.equal(getHigherMapSheetLevel("max"), "max");
  assert.equal(getLowerMapSheetLevel("max"), "mid");
  assert.equal(getLowerMapSheetLevel("mid"), "hidden");
  assert.equal(getLowerMapSheetLevel("hidden"), "hidden");
});

test("map sheet snaps to closed, medium and large heights and clamps drag travel", () => {
  const heights = getMapSheetHeights(874);
  for (const level of ["hidden", "mid", "max"]) {
    assert.equal(getNearestMapSheetLevel(heights[level], heights), level);
  }
  assert.equal(clampMapSheetHeight(-100, heights), heights.hidden);
  assert.equal(clampMapSheetHeight(2000, heights), heights.max);
});

test("map list entry and hidden sheet clear the fixed navigation footprint", () => {
  for (const bottomInset of [0, 16, 34, 48]) {
    const reserve = getBottomTabBarHeight(bottomInset);
    const entryBottom = reserve + 16;
    assert.ok(entryBottom > reserve);
    const heights = getMapSheetHeights(874);
    const hiddenTranslation = heights.max + reserve + 16;
    assert.ok(hiddenTranslation > heights.max + reserve);
  }
});

test("chat thread can still hide the whole tab bar", () => {
  assert.deepEqual(getHiddenBottomTabBarStyle(), { display: "none" });
});
