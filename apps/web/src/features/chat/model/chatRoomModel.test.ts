import { describe, expect, it } from "vitest";

import type { ChatRoom } from "../../../shared/api/types";
import {
  formatClock,
  formatInterviewMode,
  formatRelativeTime,
  formatReward,
  getCounterpart,
  getCounterpartRoleLabel,
  getFilterCounts,
  getRoomBadgeIntent,
  getRoomDisplayStatus,
  getRoomStatusClassName,
  getRoomStatusLabel,
  getVisibleChatRooms,
  isSystemMessage,
} from "./chatRoomModel";

function createRoom(overrides: Partial<ChatRoom> = {}): ChatRoom {
  const roomId = overrides.id ?? "room-1";

  return {
    id: roomId,
    interview_post_id: "post-1",
    application_id: "application-1",
    founder_id: "founder-1",
    respondent_id: "respondent-1",
    status: "open",
    last_message_at: "2026-07-16T12:00:00.000Z",
    created_at: "2026-07-16T11:00:00.000Z",
    updated_at: "2026-07-16T12:00:00.000Z",
    application: null,
    interview_post: {
      id: "post-1",
      title: "식단 인터뷰",
      service_summary: "식단 서비스를 검증해요.",
      target_description: "최근 헬스장을 다닌 사람",
      reward_amount: 30000,
      duration_minutes: 45,
      interview_mode: "online",
      location: null,
      schedule_options: ["평일 저녁"],
    } as ChatRoom["interview_post"],
    founder: {
      id: "founder-1",
      name: "창업자 한나",
      bio: "창업자 소개",
      role: "founder",
      profile_image_url: null,
    },
    respondent: {
      id: "respondent-1",
      name: "응답자 민수",
      bio: "응답자 소개",
      role: "respondent",
      profile_image_url: null,
    },
    last_message: {
      id: `message-${roomId}`,
      room_id: roomId,
      sender_id: "respondent-1",
      message_type: "user",
      body: "안녕하세요",
      metadata: {},
      created_at: "2026-07-16T12:00:00.000Z",
    },
    unread_count: 0,
    is_muted: false,
    is_hidden: false,
    last_read_at: null,
    ...overrides,
  };
}

describe("chatRoomModel", () => {
  it("derives blocked and rejected display states", () => {
    const rejectedRoom = createRoom({
      application: { status: "rejected" } as ChatRoom["application"],
    });

    expect(getRoomDisplayStatus(rejectedRoom, false)).toBe("rejected");
    expect(getRoomDisplayStatus(rejectedRoom, true)).toBe("blocked");
  });

  it("filters visible rooms by hidden state, derived status, and search query", () => {
    const rooms = [
      createRoom({
        id: "open-room",
        respondent: {
          id: "respondent-1",
          name: "민수",
          bio: null,
          role: "respondent",
          profile_image_url: null,
        },
      }),
      createRoom({
        id: "rejected-room",
        application: { status: "rejected" } as ChatRoom["application"],
        respondent: {
          id: "respondent-2",
          name: "지은",
          bio: null,
          role: "respondent",
          profile_image_url: null,
        },
      }),
      createRoom({
        id: "closed-room",
        status: "closed",
        respondent: {
          id: "respondent-3",
          name: "서연",
          bio: null,
          role: "respondent",
          profile_image_url: null,
        },
      }),
    ];

    expect(
      getVisibleChatRooms({
        activeFilter: "rejected",
        appUserId: "founder-1",
        blockedRoomIds: new Set<string>(),
        hiddenRoomIds: new Set<string>(),
        rooms,
        searchQuery: "",
      }).map((room) => room.id),
    ).toEqual(["rejected-room"]);

    expect(
      getVisibleChatRooms({
        activeFilter: "closed",
        appUserId: "founder-1",
        blockedRoomIds: new Set<string>(["open-room"]),
        hiddenRoomIds: new Set<string>(["closed-room"]),
        rooms,
        searchQuery: "민수",
      }).map((room) => room.id),
    ).toEqual(["open-room"]);
  });

  it("counts each derived filter bucket", () => {
    const rooms = [
      createRoom({ id: "open-room" }),
      createRoom({ id: "selected-room", status: "selected" }),
      createRoom({
        id: "rejected-room",
        application: { status: "rejected" } as ChatRoom["application"],
      }),
      createRoom({ id: "closed-room", status: "closed" }),
    ];

    expect(getFilterCounts(rooms, new Set<string>(["open-room"]))).toEqual({
      all: 4,
      open: 0,
      selected: 1,
      rejected: 1,
      closed: 2,
    });
  });

  it("resolves the chat counterpart from the current user perspective", () => {
    const room = createRoom();

    expect(getCounterpart(room, "founder-1").name).toBe("응답자 민수");
    expect(getCounterpart(room, "respondent-1").name).toBe("창업자 한나");
  });

  it("formats status, badge, and role labels for UI surfaces", () => {
    expect(getCounterpartRoleLabel("both")).toBe("창업자 · 인터뷰어");
    expect(getRoomStatusLabel("blocked")).toBe("제한됨");
    expect(getRoomStatusClassName("closed")).toContain("text-hypo-text-muted");
    expect(getRoomBadgeIntent("selected")).toBe("success");
  });

  it("formats reward, interview mode, relative time, and clock text", () => {
    expect(formatReward(12500)).toBe("12,500원");
    expect(formatInterviewMode("both")).toBe("대면/화상");
    expect(formatRelativeTime("2026-07-16T11:00:00.000Z", Date.parse("2026-07-16T13:01:00.000Z"))).toBe(
      "2시간 전",
    );
    expect(formatClock("2026-07-16T09:05:00.000Z")).toMatch(/\d{2}:\d{2}/);
  });

  it("identifies system messages separately from user messages", () => {
    const room = createRoom();

    expect(isSystemMessage(room.last_message!)).toBe(false);
    expect(
      isSystemMessage({
        ...room.last_message!,
        message_type: "application_selected",
      }),
    ).toBe(true);
  });
});
