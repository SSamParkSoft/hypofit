import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateCurrentUser: vi.fn() }));

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    user: { id: "member-1" },
    errorMessage: null,
    isSyncing: false,
    updateCurrentUser: mocks.updateCurrentUser,
  }),
}));
vi.mock("../../auth/useSignOutToLanding", () => ({ useSignOutToLanding: () => vi.fn() }));
vi.mock("../../auth/social/useSocialAuthIdentities", () => ({
  useSocialAuthIdentities: () => ({ data: [], isPending: false }),
}));
vi.mock("../../auth/social/useSocialIdentityLinking", () => ({
  useSocialIdentityLinking: () => ({ isPending: false, availableProviders: [] }),
}));
vi.mock("../components/ProfileAvatarUploader", () => ({ ProfileAvatarUploader: () => null }));
vi.mock("../components/ProfileIdentityPreview", () => ({ ProfileIdentityPreview: () => null }));

import { ProfileAccountSettingsSubPage } from "./ProfileAccountSettingsSubPage";

async function openEditor() {
  const user = userEvent.setup();
  render(<ProfileAccountSettingsSubPage appUser={{
    id: "member-1",
    name: "테스트 사용자",
    email: "qa@example.com",
    role: "both",
    phone: "010-1234-5678",
    bio: null,
    organization_type: null,
    organization_name: null,
    profile_image_url: null,
    profile_image_path: null,
  }} />);
  await user.click(screen.getByRole("button", { name: "수정하기" }));
  return user;
}

describe("account phone validation", () => {
  beforeEach(() => { mocks.updateCurrentUser.mockResolvedValue(undefined); });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("shows a field error and blocks an incomplete number including direct form submit", async () => {
    const user = await openEditor();
    const phone = screen.getByLabelText("전화번호");
    await user.clear(phone);
    await user.type(phone, "010123");
    expect(phone).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("전화번호는 10~11자리 국내 번호로 입력하세요.");
    expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    fireEvent.submit(phone.closest("form")!);
    expect(mocks.updateCurrentUser).not.toHaveBeenCalled();
    expect(phone).toHaveValue("010-123");
  });

  it("allows clearing the optional phone and sends null", async () => {
    const user = await openEditor();
    await user.clear(screen.getByLabelText("전화번호"));
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(mocks.updateCurrentUser).toHaveBeenCalledWith(expect.objectContaining({ phone: null }));
  });

  it("recovers from invalid input and preserves the current phone formatting", async () => {
    const user = await openEditor();
    const phone = screen.getByLabelText("전화번호");
    await user.clear(phone);
    await user.type(phone, "010123");
    await user.type(phone, "45678");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(phone).not.toHaveAttribute("aria-invalid", "true");
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(mocks.updateCurrentUser).toHaveBeenCalledWith(expect.objectContaining({ phone: "010-1234-5678" }));
  });

  it("rejects a ten-digit number without the domestic prefix", async () => {
    const user = await openEditor();
    const phone = screen.getByLabelText("전화번호");
    await user.clear(phone);
    await user.type(phone, "1234567890");
    expect(screen.getByRole("alert")).toHaveTextContent("전화번호는 0으로 시작하는 국내 번호를 입력하세요.");
    fireEvent.submit(phone.closest("form")!);
    expect(mocks.updateCurrentUser).not.toHaveBeenCalled();
  });
});
