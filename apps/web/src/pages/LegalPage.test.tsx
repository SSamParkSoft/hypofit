import { privacySections, termsSections } from "@hypofit/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigateBack: vi.fn(),
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateBack: mocks.navigateBack,
}));

import { LegalPage } from "./LegalPage";

afterEach(() => {
  cleanup();
  mocks.navigateBack.mockReset();
});

describe("LegalPage", () => {
  it("renders privacy content with matching responsive table-of-contents links", () => {
    render(<LegalPage type="privacy" />);

    expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeInTheDocument();

    privacySections.forEach((section, index) => {
      expect(screen.getByRole("heading", { level: 2, name: section.title })).toHaveAttribute(
        "id",
        `privacy-section-${index + 1}`,
      );
      expect(screen.getAllByRole("link", { name: section.title })).toHaveLength(2);
    });
  });

  it("uses history-aware back navigation with a landing fallback", async () => {
    const user = userEvent.setup();
    render(<LegalPage type="terms" />);

    expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(termsSections.length + 1);

    await user.click(screen.getByRole("link", { name: "이전 화면" }));

    expect(mocks.navigateBack).toHaveBeenCalledWith("/");
  });
});
