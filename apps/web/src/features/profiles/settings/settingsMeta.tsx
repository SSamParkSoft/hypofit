import {
  Bell,
  FileText,
  HelpCircle,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SettingsSubPageType =
  | "account"
  | "notifications"
  | "interview-settings"
  | "delete-account"
  | "role";

interface SettingsSectionItem {
  description?: string;
  href: string;
  icon: LucideIcon;
  label: string;
}

interface SettingsSection {
  items: SettingsSectionItem[];
  title: string;
}

interface SettingsSubPageMeta {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  icon: LucideIcon;
  title: string;
}

export const profileSettingsSections: SettingsSection[] = [
  {
    title: "계정과 설정",
    items: [
      {
        description: "이름, 이메일, 전화번호를 관리합니다.",
        href: "/profile/account",
        icon: UserRound,
        label: "계정 정보",
      },
      {
        description: "신청, 선정, 채팅 알림을 확인합니다.",
        href: "/profile/notifications",
        icon: Bell,
        label: "알림 설정",
      },
    ],
  },
  {
    title: "도움말",
    items: [
      {
        description: "문의 내역과 운영팀 답변을 확인합니다.",
        href: "/support/inquiries",
        icon: HelpCircle,
        label: "문의하기",
      },
      {
        description: "부적절한 모집글이나 사용자를 신고합니다.",
        href: "/report",
        icon: ShieldAlert,
        label: "신고하기",
      },
    ],
  },
  {
    title: "약관과 개인정보",
    items: [
      {
        description: "개인정보 처리와 권리 행사 방법을 확인합니다.",
        href: "/legal/privacy",
        icon: ShieldCheck,
        label: "개인정보처리방침",
      },
      {
        description: "서비스 이용 기준과 운영 정책을 확인합니다.",
        href: "/legal/terms",
        icon: FileText,
        label: "이용약관",
      },
    ],
  },
];

export const profileSettingsPageMeta: Record<SettingsSubPageType, SettingsSubPageMeta> = {
  account: {
    icon: UserRound,
    title: "계정 정보",
    description: "이름, 이메일, 연락처처럼 인터뷰 진행에 필요한 정보를 확인합니다.",
  },
  notifications: {
    actionHref: "/notifications",
    actionLabel: "알림 보기",
    icon: Bell,
    title: "알림 설정",
    description: "신청, 선정, 채팅, 일정 알림을 받을 항목을 관리합니다.",
  },
  "interview-settings": {
    actionHref: "/chat",
    actionLabel: "채팅 보기",
    icon: MessageCircle,
    title: "채팅과 인터뷰",
    description: "신청 이후 조율되는 채팅과 인터뷰 진행 상태를 확인합니다.",
  },
  "delete-account": {
    actionHref: "/account-deletion",
    actionLabel: "삭제 요청",
    icon: Trash2,
    title: "계정 삭제",
    description: "계정과 연결된 개인정보, 모집글, 신청 기록 처리 범위를 확인합니다.",
  },
  role: {
    icon: UserRound,
    title: "계정 정보",
    description: "이름, 이메일, 연락처처럼 인터뷰 진행에 필요한 정보를 확인합니다.",
  },
};
