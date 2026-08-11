import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetNavigationForTests } from "../shared/navigation/appNavigation";
import type {
  Application,
  ChatMessage,
  ChatRoom,
  InterviewPost,
  UserSummary,
} from "../shared/api/types";

const mocks = vi.hoisted(() => ({
  authState: {
    accessToken: "token-123",
    appUser: {
      bio: null,
      email: "founder@example.com",
      id: "founder-1",
      name: "창업자 김대표",
      phone: null,
      profile_image_path: null,
      profile_image_url: null,
      role: "founder" as const,
    },
    errorMessage: null,
    isLoading: false,
    user: { id: "founder-1" },
  },
  markReadMutate: vi.fn(),
  messagesByRoom: {} as Record<string, ChatMessage[]>,
  roomsQuery: {
    data: [] as ChatRoom[],
    isError: false,
    isLoading: false,
  },
  sendMessageMutation: {
    isError: false,
    isPending: false,
    mutate: vi.fn(),
  },
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../features/chat/useChatRooms", () => ({
  useChatRooms: () => mocks.roomsQuery,
}));

vi.mock("../features/chat/useChatMessages", () => ({
  useChatMessages: (roomId: string | null) => ({
    data: roomId ? (mocks.messagesByRoom[roomId] ?? []) : [],
    isLoading: false,
  }),
}));

vi.mock("../features/chat/useSendChatMessage", () => ({
  useSendChatMessage: () => mocks.sendMessageMutation,
}));

vi.mock("../features/chat/useMarkChatRoomRead", () => ({
  useMarkChatRoomRead: () => ({
    mutate: mocks.markReadMutate,
  }),
}));

import { ChatPage } from "./ChatPage";

const founder: UserSummary = {
  bio: "초기 창업자",
  id: "founder-1",
  name: "창업자 김대표",
  profile_image_url: null,
  role: "founder",
};

const respondentA: UserSummary = {
  bio: "생산성 도구 PM",
  id: "respondent-1",
  name: "박지민",
  profile_image_url: null,
  role: "respondent",
};

const respondentB: UserSummary = {
  bio: "SaaS 운영 담당자",
  id: "respondent-2",
  name: "이서준",
  profile_image_url: null,
  role: "respondent",
};

const basePost: InterviewPost = {
  distance_meters: null,
  duration_minutes: 45,
  founder,
  founder_id: founder.id,
  founder_review_summary: null,
  id: "post-1",
  interview_mode: "online",
  location: "온라인",
  location_address: null,
  location_latitude: null,
  location_longitude: null,
  location_place_name: null,
  location_precision: null,
  location_source: null,
  location_text: null,
  recruit_count: 3,
  reward_amount: 50000,
  schedule_options: ["2026-07-20T10:00:00+09:00"],
  service_summary: "가설 검증을 위한 인터뷰입니다.",
  status: "open",
  target_description: "B2B 도구를 써본 실무자",
  title: "SaaS 인터뷰",
};

const baseApplication: Application = {
  answers: { relevant_experience: "현업에서 도구를 쓰고 있습니다." },
  available_times: ["2026-07-20T10:00:00+09:00"],
  id: "application-1",
  interview_post_id: basePost.id,
  rejection_reason: null,
  respondent: respondentA,
  respondent_id: respondentA.id,
  status: "applied",
};

function buildRoom(overrides: Partial<ChatRoom> = {}): ChatRoom {
  const respondent = overrides.respondent ?? respondentA;
  const post = overrides.interview_post ?? basePost;
  const application = overrides.application ?? {
    ...baseApplication,
    respondent,
    respondent_id: respondent.id,
  };

  return {
    application,
    application_id: application.id,
    created_at: "2026-07-16T00:00:00.000Z",
    founder,
    founder_id: founder.id,
    id: overrides.id ?? "room-1",
    interview_post: post,
    interview_post_id: post.id,
    is_hidden: false,
    is_muted: false,
    last_message: {
      body: "가능한 시간을 알려주세요.",
      client_message_id: null,
      created_at: "2026-07-16T03:00:00.000Z",
      id: `message-${overrides.id ?? "room-1"}`,
      message_type: "user",
      metadata: {},
      room_id: overrides.id ?? "room-1",
      sender_id: respondent.id,
    },
    last_message_at: "2026-07-16T03:00:00.000Z",
    last_read_at: null,
    respondent,
    respondent_id: respondent.id,
    status: "open",
    unread_count: 0,
    updated_at: "2026-07-16T03:00:00.000Z",
    ...overrides,
  };
}

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    body: "안녕하세요. 일정 조율 가능해요.",
    client_message_id: null,
    created_at: "2026-07-16T04:00:00.000Z",
    id: "chat-message-1",
    message_type: "user",
    metadata: {},
    room_id: "room-1",
    sender_id: respondentA.id,
    ...overrides,
  };
}

describe("ChatPage", () => {
  beforeEach(() => {
    resetNavigationForTests();
    mocks.roomsQuery.data = [];
    mocks.roomsQuery.isError = false;
    mocks.roomsQuery.isLoading = false;
    mocks.messagesByRoom = {};
    mocks.markReadMutate.mockReset();
    mocks.sendMessageMutation.isError = false;
    mocks.sendMessageMutation.isPending = false;
    mocks.sendMessageMutation.mutate.mockReset();
    window.history.replaceState(null, "", "/chat");
  });

  afterEach(() => {
    cleanup();
    resetNavigationForTests();
    window.history.replaceState(null, "", "/");
    vi.clearAllMocks();
  });

  it("opens a thread from the room list and keeps the room id in the URL", async () => {
    const user = userEvent.setup();
    const firstRoom = buildRoom();
    const secondRoom = buildRoom({
      application: {
        ...baseApplication,
        id: "application-2",
        respondent: respondentB,
        respondent_id: respondentB.id,
      },
      id: "room-2",
      last_message: {
        body: "내일 오후도 괜찮습니다.",
        client_message_id: null,
        created_at: "2026-07-16T05:00:00.000Z",
        id: "message-room-2",
        message_type: "user",
        metadata: {},
        room_id: "room-2",
        sender_id: respondentB.id,
      },
      last_message_at: "2026-07-16T05:00:00.000Z",
      respondent: respondentB,
      respondent_id: respondentB.id,
      unread_count: 2,
      updated_at: "2026-07-16T05:00:00.000Z",
    });

    mocks.roomsQuery.data = [firstRoom, secondRoom];
    mocks.messagesByRoom["room-2"] = [
      buildMessage({
        body: "수요일 오후 3시에 뵐게요.",
        id: "thread-message-room-2",
        room_id: "room-2",
        sender_id: respondentB.id,
      }),
    ];

    render(<ChatPage />);

    expect(screen.getByText("채팅방을 선택해주세요.")).toBeInTheDocument();

    await user.click(screen.getByText("이서준").closest("button")!);

    expect(screen.queryByText("채팅방을 선택해주세요.")).not.toBeInTheDocument();
    expect(await screen.findByText("수요일 오후 3시에 뵐게요.")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-2");
    expect(mocks.markReadMutate).toHaveBeenCalledWith("room-2");
  });

  it("hydrates the selected room from the URL and returns to the list when back is pressed", async () => {
    const user = userEvent.setup();
    const targetRoom = buildRoom({
      id: "room-2",
      last_message: {
        body: "링크로 바로 들어온 채팅입니다.",
        client_message_id: null,
        created_at: "2026-07-16T05:00:00.000Z",
        id: "message-room-2",
        message_type: "user",
        metadata: {},
        room_id: "room-2",
        sender_id: respondentB.id,
      },
      respondent: respondentB,
      respondent_id: respondentB.id,
      unread_count: 1,
      updated_at: "2026-07-16T05:00:00.000Z",
    });

    mocks.roomsQuery.data = [buildRoom(), targetRoom];
    mocks.messagesByRoom["room-2"] = [
      buildMessage({
        body: "링크 진입 후에도 스레드가 바로 열려야 합니다.",
        id: "thread-message-room-2",
        room_id: "room-2",
        sender_id: respondentB.id,
      }),
    ];
    window.history.replaceState(null, "", "/chat?room=room-2");

    render(<ChatPage />);

    expect(
      await screen.findByText("링크 진입 후에도 스레드가 바로 열려야 합니다."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "채팅 목록으로 돌아가기" }));

    await waitFor(() => {
      expect(screen.getByText("채팅방을 선택해주세요.")).toBeInTheDocument();
    });
    expect(screen.queryByText("링크 진입 후에도 스레드가 바로 열려야 합니다.")).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("");
  });

  it("toggles the room mute action from the list menu", async () => {
    const user = userEvent.setup();
    const room = buildRoom();

    mocks.roomsQuery.data = [room];

    render(<ChatPage />);

    const roomRow = screen.getByText("박지민").closest("button")?.parentElement;
    expect(roomRow).not.toBeNull();

    await user.click(within(roomRow as HTMLElement).getByRole("button", { name: "채팅방 메뉴" }));
    await user.click(screen.getByRole("button", { name: "알림 끄기" }));

    await user.click(within(roomRow as HTMLElement).getByRole("button", { name: "채팅방 메뉴" }));
    expect(screen.getByRole("button", { name: "알림 켜기" })).toBeInTheDocument();
  });
});
