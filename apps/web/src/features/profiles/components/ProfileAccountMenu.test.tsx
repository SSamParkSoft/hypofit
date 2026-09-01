import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignOut = vi.fn();
const mockReplacePath = vi.fn();

vi.mock("../../auth/useAuth", () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    user: { email: "fallback@example.com" },
  }),
}));

vi.mock("../../../shared/navigation/appNavigation", () => ({
  replacePath: (...args: unknown[]) => mockReplacePath(...args),
}));

import { ProfileAccountMenu } from "./ProfileAccountMenu";

const appUser = {
  bio: null,
  email: "sehyeon@example.com",
  id: "user-1",
  name: "박세현",
  organization_name: null,
  organization_type: null,
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "both" as const,
};

describe("ProfileAccountMenu", () => {
  beforeEach(() => {
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens the account summary and profile settings action", async () => {
    const user = userEvent.setup();
    render(<ProfileAccountMenu appUser={appUser} />);

    const trigger = screen.getByRole("button", { name: "계정 메뉴" });
    const triggerAvatar = within(trigger).getByRole("img", { name: "박세현 프로필 사진" })
      .parentElement;
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(triggerAvatar).toHaveClass(
      "rounded-full",
      "border",
      "border-hypo-text/35",
      "ring-0",
    );
    expect(triggerAvatar).not.toHaveClass("rounded-hypo-lg", "ring-hypo-border");

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("박세현")).toBeInTheDocument();
    expect(screen.getByText("sehyeon@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "수정" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "프로필 설정" })).toHaveAttribute(
      "href",
      "/profile",
    );
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "프로필 설정" })).toHaveFocus();
    });
  });

  it("closes on Escape and signs out from the menu", async () => {
    const user = userEvent.setup();
    render(<ProfileAccountMenu appUser={appUser} />);

    const trigger = screen.getByRole("button", { name: "계정 메뉴" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockReplacePath).toHaveBeenCalledWith("/", {
      intent: "replace",
      scroll: "top",
    });
  });
});
