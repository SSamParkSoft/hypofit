import { describe, expect, it } from "vitest";

import {
  APP_ROOT_PATH,
  getAppDestinationFromPath,
  getAppDestinationPath,
  getAppRouteAccess,
  getAppShellActiveDestination,
  getAppRouteTitle,
  isInternalNavigationPath,
  resolveAppRoute,
} from "./appRoutes";

describe("app routes", () => {
  it("keeps the public landing page separate from the product home", () => {
    expect(APP_ROOT_PATH).toBe("/app");
    expect(getAppDestinationPath("home")).toBe("/app");
  });

  it.each([
    ["interviews", "/interviews"],
    ["map", "/map"],
    ["chat", "/chat"],
    ["profile", "/profile"],
  ] as const)("maps %s to %s", (destination, path) => {
    expect(getAppDestinationPath(destination)).toBe(path);
  });

  it.each([
    ["/app", "home"],
    ["/interviews", "interviews"],
    ["/interviews/post-1", "interviews"],
    ["/my-interviews", "interviews"],
    ["/map", "map"],
    ["/profile/location", "map"],
    ["/chat", "chat"],
    ["/profile/account", "profile"],
  ] as const)("derives %s as the %s destination", (path, destination) => {
    expect(getAppDestinationFromPath(path)).toBe(destination);
  });

  it("recognizes dynamic customer routes as internal navigation", () => {
    expect(isInternalNavigationPath("/interviews/post-1")).toBe(true);
    expect(isInternalNavigationPath("/profile/notifications")).toBe(true);
    expect(isInternalNavigationPath("https://example.com")).toBe(false);
  });

  it.each([
    ["/", "public"],
    ["/support", "public"],
    ["/account-deletion", "public"],
    ["/auth/social/callback", "public"],
    ["/app", "auth-entry"],
    ["/notifications", "protected"],
    ["/report", "protected"],
    ["/profile/report", "protected"],
    ["/profile/location", "protected"],
    ["/support/inquiries", "protected"],
    ["/support/inquiries/new", "protected"],
    ["/support/inquiries/ticket-1", "protected"],
    ["/interviews/new", "protected"],
  ] as const)("classifies %s as %s", (path, access) => {
    expect(getAppRouteAccess(path)).toBe(access);
  });

  it("keeps shell layout metadata in the route manifest", () => {
    expect(getAppShellActiveDestination("/notifications")).toBeNull();
    expect(getAppShellActiveDestination("/support/inquiries")).toBe("profile");
    expect(resolveAppRoute("/support/inquiries/ticket-1")).toMatchObject({
      id: "support-inbox-detail",
      params: { ticketId: "ticket-1" },
      shell: { activeDestination: "profile" },
    });
  });

  it.each([
    ["/", "Hypofit | 실제 고객과 시작하는 검증 인터뷰"],
    ["/app", "홈 | Hypofit"],
    ["/interviews/post-1", "인터뷰 상세 | Hypofit"],
    ["/profile/account", "계정 정보 | Hypofit"],
    ["/support", "고객지원 | Hypofit"],
    ["/support/inquiries", "내 문의 | Hypofit"],
    ["/support/inquiries/new", "새 문의 | Hypofit"],
    ["/support/inquiries/ticket-1", "문의 상세 | Hypofit"],
    ["/report", "신고하기 | Hypofit"],
    ["/profile/report", "신고하기 | Hypofit"],
    ["/profile/location", "지도 | Hypofit"],
    ["/account-deletion", "계정 삭제 | Hypofit"],
    ["/legal/privacy", "개인정보처리방침 | Hypofit"],
  ] as const)("provides an accessible document title for %s", (path, title) => {
    expect(getAppRouteTitle(path)).toBe(title);
  });

  it("resolves the auth-entry title from the same route metadata based on authentication state", () => {
    expect(getAppRouteTitle("/app", { isAuthenticated: false })).toBe("로그인 | Hypofit");
    expect(getAppRouteTitle("/app", { isAuthenticated: true })).toBe("홈 | Hypofit");
  });
});
