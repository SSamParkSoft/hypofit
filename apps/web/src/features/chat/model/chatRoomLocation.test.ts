import { afterEach, describe, expect, it } from "vitest";

import { buildChatRoomPath, getChatRoomIdFromLocation } from "./chatRoomLocation";

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("chatRoomLocation", () => {
  it("builds a room selection path with encoded query state", () => {
    expect(buildChatRoomPath("room/1 value")).toBe("/chat?room=room%2F1%20value");
  });

  it("reads the selected room from the chat route location", () => {
    expect(
      getChatRoomIdFromLocation({
        pathname: "/chat",
        search: "?room=room-2",
      }),
    ).toBe("room-2");
  });

  it("ignores room query state outside the chat route", () => {
    expect(
      getChatRoomIdFromLocation({
        pathname: "/profile",
        search: "?room=room-2",
      }),
    ).toBeNull();
  });

  it("falls back to the current browser location when no location is passed", () => {
    window.history.replaceState(null, "", "/chat?room=room-live");

    expect(getChatRoomIdFromLocation()).toBe("room-live");
  });
});
