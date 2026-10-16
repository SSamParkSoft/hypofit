import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { buildMapMarkerItems, isRenderableMapPost } from "../src/screens/map/mapMarkerGrouping.ts";
import { getPostsInMapRegion } from "../src/screens/map/mapViewport.ts";

// Execute the screen's real data derivations without loading the native MapView.
const source = ts.createSourceFile("MapScreen.tsx", readFileSync(
  new URL("../src/screens/map/MapScreen.tsx", import.meta.url), "utf8",
), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const screen = source.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "MapScreen");
const names = [
  "mapPosts", "displayMapPosts", "visibleMapPosts", "markerItems", "selectedPost",
  "selectedMarkerGroup", "sheetPosts", "sheetCount", "listButtonLabel",
];
const declarations = screen.body.statements.filter((node) => ts.isVariableStatement(node)
  && names.includes(node.declarationList.declarations[0].name.getText(source)));
assert.equal(declarations.length, names.length);
const code = ts.transpileModule(declarations.map((node) => node.getText(source)).join("\n"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const derive = new Function("state", "useMemo", "isRenderableMapPost", "getPostsInMapRegion", "buildMapMarkerItems", `
  const { posts, stableMapPosts, isLoading, isError, mapModeFilter, region,
    selectedPostId = null, selectedMarkerGroupId = null } = state;
  ${code}
  return { ${names.join(", ")} };
`);
const region = { latitude: 37, longitude: 127, latitudeDelta: 2, longitudeDelta: 2 };
const post = (id, mode, latitude = 37) => ({
  id, interview_mode: mode, location_latitude: latitude, location_longitude: 127,
});
const retained = [post("offline", "offline"), post("both", "both"), post("outside", "offline", 40)];
const evaluate = (state) => derive({
  posts: undefined, stableMapPosts: retained, isLoading: false, isError: false,
  mapModeFilter: "all", region, ...state,
}, (factory) => factory(), isRenderableMapPost, getPostsInMapRegion, buildMapMarkerItems);
const ids = (posts) => posts.map((item) => item.id);

for (const status of ["isLoading", "isError"]) {
  for (const mode of ["all", "offline", "both"]) {
    test(`${status}: retained markers, list and count obey ${mode}`, () => {
      const result = evaluate({ [status]: true, mapModeFilter: mode });
      const expected = mode === "all" ? ["offline", "both"] : [mode];
      assert.deepEqual(ids(result.visibleMapPosts), expected);
      assert.deepEqual(ids(result.sheetPosts), expected);
      assert.deepEqual(ids(result.markerItems.flatMap((item) => item.type === "group" ? item.posts : [item.post])), expected);
      assert.equal(result.sheetCount, expected.length);
      assert.equal(result.listButtonLabel, `목록 ${expected.length}개`);
      assert.deepEqual(ids(retained), ["offline", "both", "outside"]);
    });
  }
  test(`${status}: switching between disjoint modes leaves no old selection or markers`, () => {
    for (const [previous, current] of [["offline", "both"], ["both", "offline"]]) {
      const result = evaluate({
        [status]: true, stableMapPosts: [post("old", previous)], mapModeFilter: current,
        selectedPostId: "old", selectedMarkerGroupId: "group:37.000000:127.000000",
      });
      assert.deepEqual(result.markerItems, []);
      assert.deepEqual(result.sheetPosts, []);
      assert.equal(result.sheetCount, 0);
      assert.equal(result.selectedPost, null);
      assert.equal(result.selectedMarkerGroup, null);
      assert.equal(result.listButtonLabel, status === "isLoading" ? "목록 불러오는 중" : "목록 다시 시도");
    }
  });
}

test("successful responses replace retained data, including empty responses", () => {
  assert.deepEqual(ids(evaluate({ posts: [post("new", "both")], mapModeFilter: "both" }).sheetPosts), ["new"]);
  const empty = evaluate({ posts: [] });
  assert.deepEqual(empty.displayMapPosts, []);
  assert.equal(empty.sheetCount, 0);
  assert.equal(empty.listButtonLabel, "목록 0개");
  assert.deepEqual(evaluate({ stableMapPosts: [], isError: true }).markerItems, []);
});

test("filter changes invalidate the display memo", () => {
  const declaration = declarations.find((node) => node.declarationList.declarations[0].name.getText(source) === "displayMapPosts");
  const dependencies = declaration.declarationList.declarations[0].initializer.arguments[1];
  assert.ok(dependencies.elements.some((node) => node.getText(source) === "mapModeFilter"));
});
