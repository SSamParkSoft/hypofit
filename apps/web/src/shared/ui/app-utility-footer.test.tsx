import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppUtilityFooter } from "./app-utility-footer";

describe("AppUtilityFooter", () => {
  afterEach(cleanup);

  it("provides the compact legal and support links without duplicating primary navigation", () => {
    render(<AppUtilityFooter />);

    const footer = document.querySelector('[data-app-utility-footer="true"]');
    expect(footer).not.toBeNull();

    const navigation = screen.getByRole("navigation", { name: "법적 고지와 고객지원" });
    expect(within(navigation).getByRole("link", { name: "개인정보처리방침" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(within(navigation).getByRole("link", { name: "이용약관" })).toHaveAttribute(
      "href",
      "/legal/terms",
    );
    expect(within(navigation).getByRole("link", { name: "문의하기" })).toHaveAttribute(
      "href",
      "/support",
    );
    expect(screen.getByText("© 2026 contentruck. All rights reserved.")).toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "홈" })).not.toBeInTheDocument();
  });
});
