import {
  effectiveDate,
  legalDocumentStatus,
  legalPrivacyOfficerName,
  legalReleaseBlockers,
  legalServiceProviderName,
  legalServiceProviders,
  legalSupportEmail,
  privacySections,
  termsSections,
} from "@hypofit/contracts";
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
  it.each(["privacy", "terms"] as const)(
    "labels the %s revision as a non-effective draft",
    (type) => {
      render(<LegalPage type={type} />);

      expect(screen.getByText(/정식 시행본이 아닙니다/)).toBeInTheDocument();
      expect(legalDocumentStatus).toBe("draft");
      expect(effectiveDate).toBe("시행일 확정 전");
      expect(legalReleaseBlockers.length).toBeGreaterThan(0);
    },
  );

  it("uses the verified corporate operator and user-approved privacy contact", () => {
    expect(legalServiceProviderName).toBe("주식회사 콘텐트럭");
    expect(legalPrivacyOfficerName).toBe("박종인");
    expect(legalSupportEmail).toBe("ssamso8282@gmail.com");
    const privacyText = privacySections
      .flatMap((section) => section.body)
      .join("\n");
    expect(privacyText).toContain(legalServiceProviderName);
    expect(privacyText).toContain(
      `개인정보 보호책임자: ${legalPrivacyOfficerName}`,
    );
    expect(privacyText).not.toContain("정식 출시 전 운영팀");
    expect(privacyText).not.toContain("EC2 reverse proxy");
    expect(privacyText).toContain("Sentry");
    expect(privacyText).toContain("완전한 익명정보라고 부르지 않습니다");
  });

  it("separates the four recruitment workflows and external survey answers", () => {
    const termsText = termsSections
      .flatMap((section) => section.body)
      .join("\n");
    expect(termsText).toContain("인터뷰, 설문조사, 베타테스트와 연구실험");
    expect(termsText).toContain(
      "지원만으로 선정되거나 채팅 이용 권한이 생기지는 않습니다",
    );
    expect(termsText).toContain(
      "외부 설문 답변을 자체 설문 응답으로 수집하지 않습니다",
    );
    expect(termsText).toContain("보상 지급을 보증하지 않습니다");
    expect(termsText).not.toContain("사례비");
    expect(termsText).not.toContain("FGI");
  });

  it("distinguishes verified Supabase backup facts from business-data retention", () => {
    const privacyText = privacySections
      .flatMap((section) => section.body)
      .join("\n");

    expect(privacyText).toContain("주 데이터베이스 리전은 일본 도쿄");
    expect(privacyText).toContain("최근 7일분을 열람·복원");
    expect(privacyText).toContain("시점 복원(PITR)은 사용하지 않습니다");
    expect(privacyText).toContain("보관 기간이 7일이라는 뜻이 아닙니다");
    expect(privacyText).toContain("프로필 사진 원본 파일은 포함되지 않습니다");
    expect(privacyText).toContain("대시보드 조회용");
    expect(privacyText).toContain("데이터베이스에 별도로 저장된 인증 감사 기록");
    expect(legalDocumentStatus).toBe("draft");
  });

  it("keeps unused or conditional integrations distinct from verified processing", () => {
    const outsourcingText = privacySections
      .find((section) => section.title === "6. 위탁과 외부 제공자")
      ?.body.join("\n");
    const transferText = privacySections
      .find((section) => section.title === "7. 국외 이전")
      ?.body.join("\n");

    expect(outsourcingText).toContain("실제 발송에 사용하는 경우");
    expect(outsourcingText).toContain("현재 미사용으로 안내");
    expect(outsourcingText).toContain("출시 앱의 실제 활성화 여부는 별도로 확인");
    expect(transferText).toContain("코드 존재만으로 국외 이전이 발생했다고 기재하지 않습니다");
    expect(legalServiceProviders.find((provider) => provider.name === "Resend")?.purpose)
      .toContain("실제 사용 여부 확인 중");
    expect(legalServiceProviders.find((provider) => provider.name === "Sentry")?.purpose)
      .toContain("실제 활성화 여부 확인 후 고지");
  });

  it("discloses device-derived search coordinates without claiming a filing exemption", () => {
    const locationText = privacySections
      .find((section) => section.title === "10. 위치정보와 지도")
      ?.body.join("\n");

    expect(locationText).toContain("지도 중심 좌표·반경");
    expect(locationText).toContain("서버로 전송");
    expect(locationText).toContain("Kakao 장소 검색 API");
    expect(locationText).toContain("검색 좌표와 공고 장소 좌표는 다릅니다");
    expect(locationText).toContain("백그라운드 지속 수집은 현재 제공하지 않습니다");
    expect(locationText).toContain("사업자 의무·신고 해당 여부");
    expect(locationText).not.toContain("신고 없이");
    expect(locationText).not.toContain("신고가 면제");
    expect(legalDocumentStatus).toBe("draft");
  });

  it("renders privacy content with matching responsive table-of-contents links", () => {
    render(<LegalPage type="privacy" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "개인정보처리방침" }),
    ).toBeInTheDocument();

    privacySections.forEach((section, index) => {
      expect(
        screen.getByRole("heading", { level: 2, name: section.title }),
      ).toHaveAttribute("id", `privacy-section-${index + 1}`);
      expect(screen.getAllByRole("link", { name: section.title })).toHaveLength(
        2,
      );
    });
  });

  it("uses history-aware back navigation with a landing fallback", async () => {
    const user = userEvent.setup();
    render(<LegalPage type="terms" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "이용약관" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(
      termsSections.length + 1,
    );

    await user.click(screen.getByRole("link", { name: "이전 화면" }));

    expect(mocks.navigateBack).toHaveBeenCalledWith("/");
  });
});
