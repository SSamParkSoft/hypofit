import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SocialLoginButton } from "./SocialLoginButton";

describe("SocialLoginButton", () => {
  afterEach(() => cleanup());

  it.each([
    ["apple", "Apple로 로그인", "/social-auth/apple.png", "bg-[#111111]"],
    ["google", "Google로 로그인", "/social-auth/google-g-logo.png", "bg-[#F2F2F2]"],
    ["kakao", "카카오 로그인", "/social-auth/kakao.png", "bg-[#FEE500]"],
    ["naver", "네이버로 로그인", "/social-auth/naver.png", "bg-[#03A94D]"],
  ] as const)("renders the official %s asset and approved label", (provider, label, iconPath, brandClass) => {
    render(<SocialLoginButton provider={provider} onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: label });
    const icon = button.querySelector("img");

    expect(button).toHaveClass("h-[52px]", "rounded-[12px]", brandClass);
    expect(icon).toHaveAttribute("src", iconPath);
    expect(icon).toHaveAttribute("alt", "");
  });

  it("keeps its size and exposes the busy state", () => {
    render(<SocialLoginButton disabled isBusy provider="google" onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Google로 로그인" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Google 연결 중");
    expect(button).toHaveClass("h-[52px]");
  });

  it("marks the last successfully used provider without changing the button label", () => {
    render(<SocialLoginButton isLastUsed provider="kakao" onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "카카오 로그인, 최근 사용" });
    expect(button).toHaveTextContent("카카오 로그인");
    expect(screen.getByText("최근 사용")).toBeInTheDocument();
  });
});
