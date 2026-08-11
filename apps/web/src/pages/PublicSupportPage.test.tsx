import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PublicSupportPage } from "./PublicSupportPage";

describe("PublicSupportPage", () => {
  it("provides email account help and deletion paths without duplicating authenticated support", () => {
    render(<PublicSupportPage />);

    expect(screen.getByRole("heading", { name: "무엇을 도와드릴까요?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute("href", "/app");
    expect(screen.getByRole("link", { name: "이메일로 도움받기" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.queryByRole("link", { name: /로그인 문제 해결하기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /내 문의 보기/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /신고 및 안전/ })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:/),
    );
    expect(screen.getAllByRole("link", { name: /계정 삭제/ })[0]).toHaveAttribute(
      "href",
      "/account-deletion",
    );
    expect(screen.queryByRole("link", { name: "개인정보처리방침" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "이용약관" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://hypofit.bukae.co.kr/support",
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index,follow",
    );
  });
});
