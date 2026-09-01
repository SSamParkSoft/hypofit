import {
  lazy,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

import type { AppUser } from "../../shared/api/types";
import {
  APP_DESTINATION_DEFINITIONS,
  getAppDestinationFromPath,
  type AppRouteId,
  type ResolvedAppRoute,
} from "../../shared/navigation/appRoutes";
import type { AppDestination } from "../../shared/ui/navigation/types";

type ScreenProps = Record<string, unknown>;
type LazyScreen = LazyExoticComponent<ComponentType<ScreenProps>>;

export type AppRouteLayoutMode = "none" | "shell" | "standalone";

export type AppRouteLoadingConfig =
  | {
      ariaLabel: string;
      kind: "landing";
    }
  | {
      kind: "shell";
      maxWidthClassName: string;
      title: string;
    }
  | {
      kind: "standalone";
      title: string;
    };

export interface AppRouteManifestContext {
  accessToken: string | null;
  appUser: AppUser | null;
  currentPath: string;
  isAuthenticated: boolean;
  route: ResolvedAppRoute | null;
  usesDesktopProfileLayout: boolean;
}

interface BaseRouteManifestEntry {
  getProps: (context: AppRouteManifestContext) => ScreenProps;
  getScreen: (context: AppRouteManifestContext) => LazyScreen | null;
  layout: AppRouteLayoutMode;
  loading: AppRouteLoadingConfig | null;
}

export interface AppRouteIdManifestEntry extends BaseRouteManifestEntry {
  kind: "route";
  routeId: AppRouteId;
}

export interface AppDestinationManifestEntry extends BaseRouteManifestEntry {
  destination: AppDestination;
  kind: "destination";
}

export type AppRouteManifestEntry =
  | AppRouteIdManifestEntry
  | AppDestinationManifestEntry;

interface DestinationScreenDefinition {
  getProps: (context: AppRouteManifestContext) => ScreenProps;
  getScreen: (context: AppRouteManifestContext) => LazyScreen;
  loading: Extract<AppRouteLoadingConfig, { kind: "shell" }>;
}

const HomePage = lazyNamedPage(
  () => import("../../pages/ExplorePage"),
  "ExplorePage",
);
const InterviewsPage = lazyNamedPage(
  () => import("../../pages/InterviewsPage"),
  "InterviewsPage",
);
const InterviewDetailPage = lazyNamedPage(
  () => import("../../pages/InterviewDetailPage"),
  "InterviewDetailPage",
);
const MapPage = lazyNamedPage(() => import("../../pages/MapPage"), "MapPage");
const ChatPage = lazyNamedPage(
  () => import("../../pages/ChatPage"),
  "ChatPage",
);
const ProfileSubPage = lazyNamedPage(
  () => import("../../pages/ProfileSubPage"),
  "ProfileSubPage",
);
const ProfileSettingsIndex = lazyNamedPage(
  () => import("../../pages/ProfileSettingsIndex"),
  "ProfileSettingsIndex",
);
const NotificationsPage = lazyNamedPage(
  () => import("../../pages/NotificationsPage"),
  "NotificationsPage",
);
const MyInterviewsPage = lazyNamedPage(
  () => import("../../pages/MyInterviewsPage"),
  "MyInterviewsPage",
);
const NewInterviewPage = lazyNamedPage(
  () => import("../../pages/NewInterviewPage"),
  "NewInterviewPage",
);
const LegalPage = lazyNamedPage(
  () => import("../../pages/LegalPage"),
  "LegalPage",
);
const PublicSupportPage = lazyNamedPage(
  () => import("../../pages/PublicSupportPage"),
  "PublicSupportPage",
);
const SupportInboxPage = lazyNamedPage(
  () => import("../../pages/SupportInboxPage"),
  "SupportInboxPage",
);
const ReportPage = lazyNamedPage(
  () => import("../../pages/ReportPage"),
  "ReportPage",
);
const AccountDeletionPage = lazyNamedPage(
  () => import("../../pages/AccountDeletionPage"),
  "AccountDeletionPage",
);
const InstallPage = lazyNamedPage(
  () => import("../../pages/InstallPage"),
  "InstallPage",
);
const AuthCallbackBridgePage = lazyNamedPage(
  () => import("../../pages/AuthCallbackBridgePage"),
  "AuthCallbackBridgePage",
);
const AdminPage = lazyNamedPage(
  () => import("../../pages/AdminPage"),
  "AdminPage",
);
const LandingPage = lazyNamedPage(
  () => import("../../pages/LandingPage"),
  "LandingPage",
);

const destinationScreenDefinitions: Record<
  AppDestination,
  DestinationScreenDefinition
> = {
  chat: {
    getProps: emptyProps,
    getScreen: () => ChatPage,
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "채팅을 불러오는 중입니다.",
    },
  },
  home: {
    getProps: ({ isAuthenticated }) => ({ canApply: isAuthenticated }),
    getScreen: () => HomePage,
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "화면을 불러오는 중입니다.",
    },
  },
  interviews: {
    getProps: ({ appUser }) => ({ appUser }),
    getScreen: () => InterviewsPage,
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "인터뷰를 불러오는 중입니다.",
    },
  },
  map: {
    getProps: emptyProps,
    getScreen: () => MapPage,
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "지도를 불러오는 중입니다.",
    },
  },
  profile: {
    getProps: ({ appUser }) => ({ appUser }),
    // Profile 2.0 owns its own responsive layout: one column below 1200px and
    // the identity/workspace split above it. Do not swap back to the legacy
    // settings screen when a desktop viewport narrows.
    getScreen: () => ProfileSettingsIndex,
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "프로필을 불러오는 중입니다.",
    },
  },
};

export const APP_ROUTE_MANIFEST: ReadonlyArray<AppRouteManifestEntry> = [
  createRouteEntry("landing", {
    getProps: ({ isAuthenticated }) => ({ isAuthenticated }),
    getScreen: () => LandingPage,
    layout: "standalone",
    loading: {
      ariaLabel: "Hypofit 랜딩페이지를 불러오는 중",
      kind: "landing",
    },
  }),
  createRouteEntry("outreach-landing", {
    getProps: () => ({
      isAuthenticated: false,
      showWebEntry: false,
    }),
    getScreen: () => LandingPage,
    layout: "standalone",
    loading: {
      ariaLabel: "Hypofit 소개 페이지를 불러오는 중",
      kind: "landing",
    },
  }),
  createRouteEntry(
    "auth-entry",
    createDestinationScreenEntry("home"),
  ),
  createRouteEntry(
    "interviews",
    createDestinationScreenEntry("interviews"),
  ),
  createRouteEntry("new-interview", {
    getProps: ({ accessToken, appUser }) => ({ accessToken, appUser }),
    getScreen: () => NewInterviewPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "모집글 만들기를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("interview-detail", {
    getProps: ({ accessToken, route }) => ({
      accessToken,
      postId: route?.params.postId,
    }),
    getScreen: () => InterviewDetailPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[860px]",
      title: "인터뷰 상세를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("my-interviews", {
    getProps: ({ appUser }) => ({ appUser }),
    getScreen: () => MyInterviewsPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "내 인터뷰를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("map", createDestinationScreenEntry("map")),
  createRouteEntry("chat", createDestinationScreenEntry("chat")),
  createRouteEntry(
    "profile",
    createDestinationScreenEntry("profile"),
  ),
  createRouteEntry("profile-subpage", {
    getProps: ({ appUser, route }) => ({
      appUser,
      type: route?.params.type,
    }),
    getScreen: () => ProfileSubPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[760px]",
      title: "프로필 설정을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("notifications", {
    getProps: emptyProps,
    getScreen: () => NotificationsPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1120px]",
      title: "알림을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("report", {
    getProps: emptyProps,
    getScreen: () => ReportPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "신고 화면을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("support-public", {
    getProps: emptyProps,
    getScreen: () => PublicSupportPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "문의 화면을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("support-inbox-list", {
    getProps: () => ({ mode: "list" }),
    getScreen: () => SupportInboxPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "문의 내역을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("support-inbox-new", {
    getProps: () => ({ mode: "new" }),
    getScreen: () => SupportInboxPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "문의 내역을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("support-inbox-detail", {
    getProps: ({ route }) => ({
      mode: "detail",
      ticketId: route?.params.ticketId,
    }),
    getScreen: () => SupportInboxPage,
    layout: "shell",
    loading: {
      kind: "shell",
      maxWidthClassName: "max-w-[1480px]",
      title: "문의 내역을 불러오는 중입니다.",
    },
  }),
  createRouteEntry("legal-terms", {
    getProps: () => ({ type: "terms" }),
    getScreen: () => LegalPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "문서를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("legal-privacy", {
    getProps: () => ({ type: "privacy" }),
    getScreen: () => LegalPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "문서를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("account-deletion", {
    getProps: emptyProps,
    getScreen: () => AccountDeletionPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "계정 삭제 안내를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("install", {
    getProps: emptyProps,
    getScreen: () => InstallPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "설치 안내를 불러오는 중입니다.",
    },
  }),
  createRouteEntry("social-auth-callback", {
    getProps: emptyProps,
    getScreen: () => AuthCallbackBridgePage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "소셜 로그인을 확인하고 있어요.",
    },
  }),
  createRouteEntry("admin", {
    getProps: ({ accessToken }) => ({ accessToken }),
    getScreen: () => AdminPage,
    layout: "standalone",
    loading: {
      kind: "standalone",
      title: "관리자 콘솔을 불러오는 중입니다.",
    },
  }),
  ...APP_DESTINATION_DEFINITIONS.map((destination) =>
    createDestinationEntry(destination.id),
  ),
];

const routeEntriesById = new Map(
  APP_ROUTE_MANIFEST.filter(isRouteManifestRouteEntry).map((entry) => [
    entry.routeId,
    entry,
  ]),
);
const destinationEntriesById = new Map(
  APP_ROUTE_MANIFEST.filter(isRouteManifestDestinationEntry).map((entry) => [
    entry.destination,
    entry,
  ]),
);

export function getAppRouteManifestEntry(
  route: ResolvedAppRoute | null,
  pathname: string,
): AppRouteManifestEntry | null {
  if (route) {
    return routeEntriesById.get(route.id) ?? null;
  }

  return destinationEntriesById.get(getAppDestinationFromPath(pathname)) ?? null;
}

export function isRouteManifestDestinationEntry(
  entry: AppRouteManifestEntry,
): entry is AppDestinationManifestEntry {
  return entry.kind === "destination";
}

export function isRouteManifestRouteEntry(
  entry: AppRouteManifestEntry,
): entry is AppRouteIdManifestEntry {
  return entry.kind === "route";
}

function createDestinationEntry(
  destination: AppDestination,
): AppDestinationManifestEntry {
  return {
    destination,
    kind: "destination",
    ...createDestinationScreenEntry(destination),
  };
}

function createDestinationScreenEntry(
  destination: AppDestination,
): BaseRouteManifestEntry {
  return {
    layout: "shell",
    ...destinationScreenDefinitions[destination],
  };
}

function createRouteEntry(
  routeId: AppRouteId,
  entry: BaseRouteManifestEntry,
): AppRouteIdManifestEntry {
  return {
    kind: "route",
    routeId,
    ...entry,
  };
}

function emptyProps() {
  return {};
}

function lazyNamedPage(
  loadModule: () => Promise<Record<string, unknown>>,
  exportName: string,
): LazyScreen {
  return lazy(async () => ({
    default: loadModuleResult(await loadModule(), exportName),
  }));
}

function loadModuleResult(
  moduleExports: Record<string, unknown>,
  exportName: string,
): ComponentType<ScreenProps> {
  return moduleExports[exportName] as unknown as ComponentType<ScreenProps>;
}
