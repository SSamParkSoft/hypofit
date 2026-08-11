import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applicationsQuery: {
    data: [{}],
    isLoading: false,
  },
  authState: {
    accessToken: "token-123",
    errorMessage: null as string | null,
    isSyncing: false,
    signOut: vi.fn(),
    syncCurrentUser: vi.fn(),
    user: {
      email: "review@example.com",
      id: "user-1",
    },
  },
  chatRoomsQuery: {
    data: [{}],
    isLoading: false,
  },
  interviewPostsQuery: {
    data: [{}],
    isLoading: false,
  },
  navigateTo: vi.fn(),
  sessionsQuery: {
    data: [{ status: "scheduled" }],
    isLoading: false,
  },
  uploadProfileImage: vi.fn(),
}));

vi.mock("../features/applications/useApplications", () => ({
  useApplications: () => mocks.applicationsQuery,
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../features/chat/useChatRooms", () => ({
  useChatRooms: () => mocks.chatRoomsQuery,
}));

vi.mock("../features/interview-posts/useInterviewPosts", () => ({
  useInterviewPosts: () => mocks.interviewPostsQuery,
}));

vi.mock("../features/profiles/components/ProfileAvatarUploader", () => ({
  ProfileAvatarUploader: ({
    disabled,
    onFileSelected,
  }: {
    disabled?: boolean;
    onFileSelected: (file: File) => void;
  }) => (
    <button
      disabled={disabled}
      type="button"
      onClick={() => onFileSelected(new File(["avatar"], "avatar.png", { type: "image/png" }))}
    >
      프로필 사진 업로드
    </button>
  ),
}));

vi.mock("../features/sessions/useSessions", () => ({
  useSessions: () => mocks.sessionsQuery,
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateTo: (...args: unknown[]) => mocks.navigateTo(...args),
}));

vi.mock("../shared/supabase/profileImages", () => ({
  uploadProfileImage: (...args: unknown[]) => mocks.uploadProfileImage(...args),
}));

import { ProfilePage } from "./ProfilePage";

const appUser = {
  bio: "기존 소개",
  email: "review@example.com",
  id: "user-1",
  name: "박세현",
  phone: "010-1111-2222",
  profile_image_path: null,
  profile_image_url: null,
  role: "both" as const,
};

describe("ProfilePage", () => {
  beforeEach(() => {
    mocks.authState.accessToken = "token-123";
    mocks.authState.errorMessage = null;
    mocks.authState.isSyncing = false;
    mocks.authState.signOut.mockResolvedValue(undefined);
    mocks.authState.syncCurrentUser.mockResolvedValue(undefined);
    mocks.authState.user = {
      email: "review@example.com",
      id: "user-1",
    };

    mocks.applicationsQuery.data = [{}];
    mocks.applicationsQuery.isLoading = false;
    mocks.interviewPostsQuery.data = [{}];
    mocks.interviewPostsQuery.isLoading = false;
    mocks.sessionsQuery.data = [{ status: "scheduled" }];
    mocks.sessionsQuery.isLoading = false;
    mocks.chatRoomsQuery.data = [{}];
    mocks.chatRoomsQuery.isLoading = false;

    mocks.navigateTo.mockReset();
    mocks.uploadProfileImage.mockReset();
    mocks.uploadProfileImage.mockResolvedValue({
      path: "profiles/user-1/avatar.png",
      publicUrl: "https://example.com/avatar.png",
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uploads a new profile image, preserves founder routing, and signs out from the page shell", async () => {
    const user = userEvent.setup();

    render(<ProfilePage appUser={appUser} />);

    await user.click(screen.getByRole("button", { name: "프로필 사진 업로드" }));

    expect(mocks.uploadProfileImage).toHaveBeenCalledWith("user-1", expect.any(File));
    expect((mocks.uploadProfileImage.mock.calls[0]?.[1] as File).name).toBe("avatar.png");
    expect(mocks.authState.syncCurrentUser).toHaveBeenCalledWith({
      bio: "기존 소개",
      name: "박세현",
      phone: "010-1111-2222",
      profile_image_path: "profiles/user-1/avatar.png",
      profile_image_url: "https://example.com/avatar.png",
      role: "both",
    });
    expect(await screen.findByText("프로필 사진이 저장됐어요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "모집글 만들기" }));
    expect(mocks.navigateTo).toHaveBeenCalledWith("/interviews/new");

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(mocks.authState.signOut).toHaveBeenCalledTimes(1);
  });

  it("shows loading helper copy and exposes auth failures as an alert", () => {
    mocks.authState.errorMessage = "계정 정보를 저장하지 못했어요.";
    mocks.applicationsQuery.data = [];
    mocks.applicationsQuery.isLoading = true;
    mocks.interviewPostsQuery.data = [];
    mocks.interviewPostsQuery.isLoading = true;
    mocks.sessionsQuery.data = [];
    mocks.sessionsQuery.isLoading = true;
    mocks.chatRoomsQuery.data = [];
    mocks.chatRoomsQuery.isLoading = true;

    render(<ProfilePage appUser={appUser} />);

    expect(screen.getByRole("alert")).toHaveTextContent("계정 정보를 저장하지 못했어요.");
    expect(screen.getByText("신청 상태와 다음 조율 단계를 불러오는 중이에요.")).toBeInTheDocument();
    expect(screen.getByText("내 모집글과 지원자 진행 상태를 불러오는 중이에요.")).toBeInTheDocument();
    expect(screen.getByText("채팅 진행 상황을 불러오는 중이에요.")).toBeInTheDocument();
  });
});
