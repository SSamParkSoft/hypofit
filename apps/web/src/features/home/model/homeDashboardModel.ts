import {
  formatCompensationSummary,
  formatUserDisplayName,
  interviewModeLabels,
  normalizeCompensations,
} from "@hypofit/contracts";

import type {
  Application,
  ChatRoom,
  InterviewPost,
  Session,
} from "../../../shared/api/types";
import { buildChatRoomPath } from "../../chat/model/chatRoomLocation";

export interface HomeDashboardAction {
  href: string;
  label: string;
}

export interface HomeDashboardFocus {
  badgeLabel: string;
  body: string;
  currentStep: number;
  primaryAction: HomeDashboardAction;
  secondaryAction: HomeDashboardAction | null;
  stageLabel: string;
  steps: string[];
  title: string;
}

export interface HomeDashboardSchedule {
  counterpart: string;
  href: string;
  interviewTitle: string;
  location: string;
  when: string;
}

export interface HomeDashboardInterview {
  post: InterviewPost;
  secondaryMeta: string;
}

export interface HomeDashboardRecommendation {
  post: InterviewPost;
}

export interface HomeDashboardData {
  focus: HomeDashboardFocus;
  nextSchedule: HomeDashboardSchedule | null;
  recentInterviews: HomeDashboardInterview[];
  recommendation: HomeDashboardRecommendation | null;
}

export function formatInterviewPublishedTime(value: string | undefined, now = Date.now()) {
  const createdAt = value ? new Date(value).getTime() : Number.NaN;
  if (!Number.isFinite(createdAt)) {
    return "최근 등록";
  }

  const elapsedMinutes = Math.max(0, Math.floor((now - createdAt) / 60_000));
  if (elapsedMinutes < 1) {
    return "방금 등록";
  }
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}분 전 등록`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}시간 전 등록`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) {
    return `${elapsedDays}일 전 등록`;
  }

  return `${new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(createdAt)} 등록`;
}

interface BuildHomeDashboardInput {
  applications: Application[];
  appUserId: string | null;
  chatRooms: ChatRoom[];
  now?: number;
  posts: InterviewPost[];
  sessions: Session[];
}

export function buildHomeDashboardData({
  applications,
  appUserId,
  chatRooms,
  now = Date.now(),
  posts,
  sessions,
}: BuildHomeDashboardInput): HomeDashboardData {
  const postById = buildPostMap(posts, chatRooms);
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const roomByApplicationId = new Map(chatRooms.map((room) => [room.application_id, room]));
  const scheduledSessionByApplicationId = new Map(
    sessions
      .filter((session) => session.status === "scheduled")
      .map((session) => [session.application_id, session]),
  );
  const unreadCount = chatRooms.reduce((sum, room) => sum + Math.max(0, room.unread_count), 0);
  const unreadRoom = [...chatRooms]
    .filter((room) => room.unread_count > 0)
    .sort((left, right) => right.unread_count - left.unread_count)[0];

  const focus = buildFocus({
    applications,
    appUserId,
    postById,
    roomByApplicationId,
    scheduledSessionByApplicationId,
    sessions,
    unreadCount,
    unreadRoom,
  });

  const nextSession = sessions
    .filter((session) => {
      const scheduledAt = parseDate(session.scheduled_at);
      return session.status === "scheduled" && Number.isFinite(scheduledAt) && scheduledAt >= now;
    })
    .sort((left, right) => parseDate(left.scheduled_at) - parseDate(right.scheduled_at))[0];

  const nextSchedule = nextSession
    ? buildSchedule({
        appUserId,
        application: applicationById.get(nextSession.application_id) ?? nextSession.application ?? null,
        chatRoom: roomByApplicationId.get(nextSession.application_id) ?? null,
        now,
        postById,
        session: nextSession,
      })
    : null;

  const openPosts = posts.filter((post) => post.status === "open");
  const recentInterviews = openPosts.slice(0, 4).map((post) => ({
    post,
    secondaryMeta: buildPostMeta(post),
  }));
  const appliedPostIds = new Set(
    applications
      .filter((application) => application.respondent_id === appUserId)
      .map((application) => application.interview_post_id),
  );
  const recommendationPost = [...openPosts]
    .filter((post) => post.founder_id !== appUserId && !appliedPostIds.has(post.id))
    .sort((left, right) => right.reward_amount - left.reward_amount)[0] ?? null;

  return {
    focus,
    nextSchedule,
    recentInterviews,
    recommendation: recommendationPost
      ? {
          post: recommendationPost,
        }
      : null,
  };
}

function buildFocus({
  applications,
  appUserId,
  postById,
  roomByApplicationId,
  scheduledSessionByApplicationId,
  sessions,
  unreadCount,
  unreadRoom,
}: {
  applications: Application[];
  appUserId: string | null;
  postById: Map<string, InterviewPost>;
  roomByApplicationId: Map<string, ChatRoom>;
  scheduledSessionByApplicationId: Map<string, Session>;
  sessions: Session[];
  unreadCount: number;
  unreadRoom?: ChatRoom;
}): HomeDashboardFocus {
  const founderPending = applications.filter((application) => {
    const post = postById.get(application.interview_post_id);
    return application.status === "applied" && post?.founder_id === appUserId;
  });

  if (founderPending.length > 0) {
    const grouped = new Map<string, Application[]>();
    founderPending.forEach((application) => {
      grouped.set(application.interview_post_id, [
        ...(grouped.get(application.interview_post_id) ?? []),
        application,
      ]);
    });
    const [postId, pending] = [...grouped.entries()].sort(
      (left, right) => right[1].length - left[1].length,
    )[0];
    const post = postById.get(postId);
    return withUnreadSecondary(
      {
        badgeLabel: "진행 중",
        body: `새 지원자 ${pending.length}명의 신청 내용을 확인하고 다음 단계를 정해보세요.`,
        currentStep: 1,
        primaryAction: { href: "/my-interviews", label: `지원자 ${pending.length}명 보기` },
        secondaryAction: null,
        stageLabel: "지원자 확인 단계",
        steps: ["모집글 등록", "지원자 확인", "선정", "인터뷰"],
        title: post?.title ?? "새 인터뷰 신청이 도착했어요",
      },
      unreadCount,
      unreadRoom,
    );
  }

  const selectedApplication = applications.find(
    (application) =>
      application.respondent_id === appUserId &&
      application.status === "selected" &&
      !scheduledSessionByApplicationId.has(application.id),
  );
  if (selectedApplication) {
    const room = roomByApplicationId.get(selectedApplication.id);
    const post = postById.get(selectedApplication.interview_post_id);
    return withUnreadSecondary(
      {
        badgeLabel: "선정",
        body: "선정된 인터뷰예요. 채팅에서 가능한 일정과 진행 방식을 조율해보세요.",
        currentStep: 2,
        primaryAction: {
          href: room ? buildChatRoomPath(room.id) : "/chat",
          label: "일정 조율하기",
        },
        secondaryAction: null,
        stageLabel: "일정 조율 단계",
        steps: ["신청", "선정", "일정 조율", "인터뷰"],
        title: post?.title ?? "선정된 인터뷰가 있어요",
      },
      unreadCount,
      unreadRoom,
    );
  }

  const pendingApplication = applications.find(
    (application) => application.respondent_id === appUserId && application.status === "applied",
  );
  if (pendingApplication) {
    const post = postById.get(pendingApplication.interview_post_id);
    return withUnreadSecondary(
      {
        badgeLabel: "신청",
        body: "신청이 전달됐어요. 결과가 오면 알림과 채팅에서 바로 확인할 수 있어요.",
        currentStep: 0,
        primaryAction: { href: "/my-interviews", label: "신청 상태 보기" },
        secondaryAction: null,
        stageLabel: "선정 대기 단계",
        steps: ["신청", "선정", "일정 조율", "인터뷰"],
        title: post?.title ?? "결과를 기다리는 신청이 있어요",
      },
      unreadCount,
      unreadRoom,
    );
  }

  if (unreadRoom) {
    return {
      badgeLabel: "새 대화",
      body: `읽지 않은 메시지가 ${unreadCount}개 있어요. 필요한 일정과 진행 내용을 확인해보세요.`,
      currentStep: 2,
      primaryAction: { href: buildChatRoomPath(unreadRoom.id), label: "채팅 확인하기" },
      secondaryAction: null,
      stageLabel: "채팅 확인 단계",
      steps: ["신청", "선정", "일정 조율", "인터뷰"],
      title: unreadRoom.interview_post?.title ?? "새 메시지가 도착했어요",
    };
  }

  const scheduledSession = sessions.find((session) => session.status === "scheduled");
  if (scheduledSession) {
    const application = applications.find((item) => item.id === scheduledSession.application_id);
    const room = roomByApplicationId.get(scheduledSession.application_id);
    const post = application ? postById.get(application.interview_post_id) : null;
    return {
      badgeLabel: "예정",
      body: "예정된 인터뷰의 시간과 진행 방법을 다시 확인해보세요.",
      currentStep: 3,
      primaryAction: { href: room ? buildChatRoomPath(room.id) : "/chat", label: "일정 확인하기" },
      secondaryAction: null,
      stageLabel: "인터뷰 예정 단계",
      steps: ["신청", "선정", "일정 조율", "인터뷰"],
      title: post?.title ?? "예정된 인터뷰가 있어요",
    };
  }

  return {
    badgeLabel: "시작하기",
    body: "관심 있는 인터뷰를 살펴보고 내 경험에 맞는 모집글에 신청해보세요.",
    currentStep: -1,
    primaryAction: { href: "/interviews", label: "인터뷰 둘러보기" },
    secondaryAction: null,
    stageLabel: "새 인터뷰 탐색",
    steps: ["인터뷰 찾기", "신청", "일정 조율", "인터뷰"],
    title: "지금 이어갈 인터뷰가 없어요",
  };
}

function withUnreadSecondary(
  focus: HomeDashboardFocus,
  unreadCount: number,
  unreadRoom?: ChatRoom,
): HomeDashboardFocus {
  if (unreadCount <= 0 || !unreadRoom) {
    return focus;
  }
  return {
    ...focus,
    secondaryAction: {
      href: buildChatRoomPath(unreadRoom.id),
      label: `읽지 않은 채팅 ${unreadCount}개`,
    },
  };
}

function buildSchedule({
  appUserId,
  application,
  chatRoom,
  now,
  postById,
  session,
}: {
  appUserId: string | null;
  application: Application | null;
  chatRoom: ChatRoom | null;
  now: number;
  postById: Map<string, InterviewPost>;
  session: Session;
}): HomeDashboardSchedule {
  const post = application ? postById.get(application.interview_post_id) : chatRoom?.interview_post;
  const counterpart = chatRoom
    ? formatUserDisplayName(
        chatRoom.founder_id === appUserId ? chatRoom.respondent : chatRoom.founder,
        "인터뷰 상대",
      )
    : application?.respondent
      ? formatUserDisplayName(application.respondent)
      : "인터뷰 상대";

  return {
    counterpart,
    href: chatRoom ? buildChatRoomPath(chatRoom.id) : "/chat",
    interviewTitle: post?.title ?? "예정된 인터뷰",
    location:
      session.meeting_type === "online"
        ? session.meeting_url ?? "화상 인터뷰"
        : session.place ?? "장소 조율 중",
    when: formatScheduleWhen(session.scheduled_at, now),
  };
}

function buildPostMap(posts: InterviewPost[], chatRooms: ChatRoom[]) {
  const map = new Map(posts.map((post) => [post.id, post]));
  chatRooms.forEach((room) => {
    if (room.interview_post) {
      map.set(room.interview_post.id, room.interview_post);
    }
  });
  return map;
}

function buildPostMeta(post: InterviewPost) {
  const type = post.recruitment_type === "survey" ? "설문조사" : post.recruitment_type === "beta_test" ? "베타테스트" : "인터뷰";
  return `${type} · ${formatCompensationSummary(normalizeCompensations(post.compensations, post.reward_amount))} · ${post.duration_minutes}분`;
}

function formatScheduleWhen(value: string, now: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "일정 확인";
  }
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDifference = Math.floor((date.getTime() - startOfToday.getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" }).format(date);
  if (dayDifference === 0) return `오늘 ${time}`;
  if (dayDifference === 1) return `내일 ${time}`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function parseDate(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}
