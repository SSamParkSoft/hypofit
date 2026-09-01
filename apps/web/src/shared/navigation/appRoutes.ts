import type {
  AppDestination,
  AppShellActiveDestination,
} from "../ui/navigation/types";

export const APP_ROOT_PATH = "/app";
export type AppRouteAccess = "public" | "auth-entry" | "protected";
export type AppRouteId =
  | "landing"
  | "outreach-landing"
  | "auth-entry"
  | "interviews"
  | "interview-detail"
  | "new-interview"
  | "my-interviews"
  | "map"
  | "chat"
  | "profile"
  | "profile-subpage"
  | "notifications"
  | "report"
  | "support-public"
  | "support-inbox-list"
  | "support-inbox-new"
  | "support-inbox-detail"
  | "legal-terms"
  | "legal-privacy"
  | "account-deletion"
  | "install"
  | "auth-callback"
  | "social-auth-callback"
  | "admin";

type RouteParams = Record<string, string>;

export interface AppRouteDefinition {
  access: AppRouteAccess;
  id: AppRouteId;
  match: (pathname: string) => RouteParams | null;
  resolveTitle: (
    params: RouteParams,
    options: { isAuthenticated: boolean },
  ) => string;
  shell?: {
    activeDestination: AppShellActiveDestination;
  };
}

export interface ResolvedAppRoute {
  access: AppRouteAccess;
  id: AppRouteId;
  params: RouteParams;
  pathname: string;
  shell: AppRouteDefinition["shell"] | null;
  title: string;
}

export const APP_DESTINATION_DEFINITIONS = [
  { id: "home", href: APP_ROOT_PATH, label: "홈" },
  { id: "interviews", href: "/interviews", label: "공고" },
  { id: "map", href: "/map", label: "지도" },
  { id: "chat", href: "/chat", label: "채팅" },
  { id: "profile", href: "/profile", label: "프로필" },
] as const satisfies ReadonlyArray<{
  href: string;
  id: AppDestination;
  label: string;
  mobileLabel?: string;
}>;

const destinationPathMap = APP_DESTINATION_DEFINITIONS.reduce<
  Record<AppDestination, string>
>((accumulator, destination) => {
  accumulator[destination.id] = destination.href;
  return accumulator;
}, {} as Record<AppDestination, string>);

const PROFILE_SUBPAGE_TITLES = {
  account: "계정 정보 | Hypofit",
  "delete-account": "계정 삭제 | Hypofit",
  "interview-settings": "인터뷰 설정 | Hypofit",
  notifications: "알림 설정 | Hypofit",
  role: "계정 정보 | Hypofit",
} as const;

export const APP_ROUTE_DEFINITIONS: ReadonlyArray<AppRouteDefinition> = [
  {
    access: "public",
    id: "landing",
    match: matchExact("/"),
    resolveTitle: () => "Hypofit | 참여자 모집과 참여를 한곳에서",
  },
  {
    access: "public",
    id: "outreach-landing",
    match: matchExact("/landing"),
    resolveTitle: () => "Hypofit | 참여자 모집과 참여를 한곳에서",
  },
  {
    access: "auth-entry",
    id: "auth-entry",
    match: matchExact(APP_ROOT_PATH),
    resolveTitle: (_params, { isAuthenticated }) =>
      isAuthenticated ? "홈 | Hypofit" : "로그인 | Hypofit",
    shell: { activeDestination: "home" },
  },
  {
    access: "protected",
    id: "interviews",
    match: matchExact("/interviews"),
    resolveTitle: () => "공고 | Hypofit",
    shell: { activeDestination: "interviews" },
  },
  {
    access: "protected",
    id: "new-interview",
    match: matchExact("/interviews/new"),
    resolveTitle: () => "공고 만들기 | Hypofit",
    shell: { activeDestination: "interviews" },
  },
  {
    access: "protected",
    id: "interview-detail",
    match: matchRegex(/^\/interviews\/(?<postId>[^/]+)$/),
    resolveTitle: () => "공고 상세 | Hypofit",
    shell: { activeDestination: "interviews" },
  },
  {
    access: "protected",
    id: "my-interviews",
    match: matchExact("/my-interviews"),
    resolveTitle: () => "내 참여 | Hypofit",
    shell: { activeDestination: "interviews" },
  },
  {
    access: "protected",
    id: "map",
    match: (pathname) =>
      pathname === "/map" || pathname === "/profile/location" ? {} : null,
    resolveTitle: () => "지도 | Hypofit",
    shell: { activeDestination: "map" },
  },
  {
    access: "protected",
    id: "chat",
    match: matchExact("/chat"),
    resolveTitle: () => "채팅 | Hypofit",
    shell: { activeDestination: "chat" },
  },
  {
    access: "protected",
    id: "profile",
    match: matchExact("/profile"),
    resolveTitle: () => "프로필 | Hypofit",
    shell: { activeDestination: "profile" },
  },
  {
    access: "protected",
    id: "profile-subpage",
    match: (pathname) => {
      const type = getProfileSubPageType(pathname);
      return type ? { type } : null;
    },
    resolveTitle: (params) =>
      PROFILE_SUBPAGE_TITLES[
        params.type as keyof typeof PROFILE_SUBPAGE_TITLES
      ] ?? "프로필 설정 | Hypofit",
    shell: { activeDestination: "profile" },
  },
  {
    access: "protected",
    id: "notifications",
    match: matchExact("/notifications"),
    resolveTitle: () => "알림 | Hypofit",
    shell: { activeDestination: null },
  },
  {
    access: "protected",
    id: "report",
    match: (pathname) =>
      pathname === "/report" || pathname === "/profile/report" ? {} : null,
    resolveTitle: () => "신고하기 | Hypofit",
  },
  {
    access: "public",
    id: "support-public",
    match: matchExact("/support"),
    resolveTitle: () => "고객지원 | Hypofit",
  },
  {
    access: "protected",
    id: "support-inbox-list",
    match: matchExact("/support/inquiries"),
    resolveTitle: () => "내 문의 | Hypofit",
    shell: { activeDestination: "profile" },
  },
  {
    access: "protected",
    id: "support-inbox-new",
    match: matchExact("/support/inquiries/new"),
    resolveTitle: () => "새 문의 | Hypofit",
    shell: { activeDestination: "profile" },
  },
  {
    access: "protected",
    id: "support-inbox-detail",
    match: matchRegex(/^\/support\/inquiries\/(?<ticketId>[^/]+)$/),
    resolveTitle: () => "문의 상세 | Hypofit",
    shell: { activeDestination: "profile" },
  },
  {
    access: "public",
    id: "legal-terms",
    match: matchExact("/legal/terms"),
    resolveTitle: () => "이용약관 | Hypofit",
  },
  {
    access: "public",
    id: "legal-privacy",
    match: matchExact("/legal/privacy"),
    resolveTitle: () => "개인정보처리방침 | Hypofit",
  },
  {
    access: "public",
    id: "account-deletion",
    match: matchExact("/account-deletion"),
    resolveTitle: () => "계정 삭제 | Hypofit",
  },
  {
    access: "public",
    id: "install",
    match: matchExact("/install"),
    resolveTitle: () => "앱 설치 | Hypofit",
  },
  {
    access: "public",
    id: "social-auth-callback",
    match: matchExact("/auth/social/callback"),
    resolveTitle: () => "소셜 로그인 확인 | Hypofit",
  },
  {
    access: "protected",
    id: "admin",
    match: matchExact("/admin"),
    resolveTitle: () => "관리자 | Hypofit",
  },
];

export function resolveAppRoute(
  pathname: string,
  options: { isAuthenticated?: boolean } = {},
): ResolvedAppRoute | null {
  for (const definition of APP_ROUTE_DEFINITIONS) {
    const params = definition.match(pathname);
    if (!params) {
      continue;
    }

    return {
      access: definition.access,
      id: definition.id,
      params,
      pathname,
      shell: definition.shell ?? null,
      title: definition.resolveTitle(params, {
        isAuthenticated: options.isAuthenticated ?? true,
      }),
    };
  }

  return null;
}

export function getAppDestinationPath(destination: AppDestination) {
  return destinationPathMap[destination];
}

export function getAppDestinationFromPath(pathname: string): AppDestination {
  const route = resolveAppRoute(pathname);
  const activeDestination = route?.shell?.activeDestination;

  if (activeDestination) {
    return activeDestination;
  }

  if (pathname === "/chat") {
    return "chat";
  }

  if (pathname === "/map") {
    return "map";
  }

  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return "profile";
  }

  if (
    pathname === "/interviews" ||
    pathname === "/my-interviews" ||
    pathname.startsWith("/interviews/")
  ) {
    return "interviews";
  }

  return "home";
}

export function getAppRouteAccess(pathname: string): AppRouteAccess | null {
  return resolveAppRoute(pathname)?.access ?? null;
}

export function getAppShellActiveDestination(
  pathname: string,
): AppShellActiveDestination {
  return resolveAppRoute(pathname)?.shell?.activeDestination;
}

export function isInternalNavigationPath(pathname: string) {
  return resolveAppRoute(pathname) !== null;
}

export function getAppRouteTitle(
  pathname: string,
  options: { isAuthenticated?: boolean } = {},
) {
  return resolveAppRoute(pathname, options)?.title ?? "Hypofit";
}

function getProfileSubPageType(pathname: string) {
  const routes = {
    "/profile/account": "account",
    "/profile/delete-account": "delete-account",
    "/profile/interviews": "interview-settings",
    "/profile/notifications": "notifications",
    "/profile/role": "role",
  } as const;

  return routes[pathname as keyof typeof routes] ?? null;
}

function matchExact(path: string) {
  return (pathname: string) => (pathname === path ? {} : null);
}

function matchRegex(pattern: RegExp) {
  return (pathname: string) => {
    const match = pattern.exec(pathname);
    if (!match) {
      return null;
    }

    if (!match.groups) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(match.groups).filter(
        (entry): entry is [string, string] => Boolean(entry[1]),
      ),
    );
  };
}
