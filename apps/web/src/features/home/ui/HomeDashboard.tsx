import { formatCompensationSummary, normalizeCompensations } from "@hypofit/contracts";
import { useState } from "react";

import { navigateTo } from "../../../shared/navigation/appNavigation";
import { Badge } from "../../../shared/ui/badge";
import { Avatar } from "../../../shared/ui/avatar";
import { Button } from "../../../shared/ui/button";
import { AppIcon } from "../../../shared/ui/icon";
import { NotificationButton } from "../../../shared/ui/notification-button";
import { PageLayout } from "../../../shared/ui/page";
import { EmptyState, ErrorState } from "../../../shared/ui/state";
import {
  formatInterviewPublishedTime,
  type HomeDashboardRecommendation,
} from "../model/homeDashboardModel";
import type {
  HomeDashboardFocus,
  HomeDashboardInterview,
  HomeDashboardSchedule,
} from "../model/homeDashboardModel";
import { useHomeDashboard } from "../useHomeDashboard";
import {
  InterviewPreviewDialog,
  type HomeInterviewPreview,
} from "./InterviewPreviewDialog";

interface HomeDashboardProps {
  accessToken: string | null;
  appUserId: string | null;
  canApply: boolean;
  displayName: string;
}

export function HomeDashboard({
  accessToken,
  appUserId,
  canApply,
  displayName,
}: HomeDashboardProps) {
  const [selectedPreview, setSelectedPreview] =
    useState<HomeInterviewPreview | null>(null);
  const { data, hasError, isLoading, refetch } = useHomeDashboard({
    accessToken,
    appUserId,
  });

  return (
    <>
      <PageLayout className="min-h-0 gap-7 pb-10" variant="list-detail">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <p className="ui-metadata mb-2 text-hypo-brand">오늘의 Hypofit</p>
            <h1 className="text-[1.625rem] font-bold leading-[1.35] text-hypo-text sm:text-[1.875rem]">
              {displayName}님, 안녕하세요
            </h1>
            <p className="ui-body mt-2 text-hypo-text-muted">
              오늘 이어갈 일과 새로 올라온 공고를 확인하세요.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationButton />
          </div>
        </header>

        {hasError ? (
          <ErrorState title="홈 정보를 모두 불러오지 못했어요.">
            <button
              className="mt-2 font-bold underline underline-offset-4"
              onClick={() => void refetch()}
              type="button"
            >
              다시 불러오기
            </button>
          </ErrorState>
        ) : null}

        {isLoading ? (
          <HomeDashboardSkeleton />
        ) : (
          <>
            <section
              aria-label="오늘 이어갈 공고"
              className="grid items-stretch gap-4 lg:grid-cols-12"
            >
              <CurrentFocusPanel focus={data.focus} />
              <NextSchedulePanel schedule={data.nextSchedule} />
            </section>

            <section className="grid items-start gap-7 xl:grid-cols-12">
              <RecentInterviews
                canApply={canApply}
                interviews={data.recentInterviews}
                onPreview={setSelectedPreview}
              />
              <RecommendationSpotlight
                recommendation={data.recommendation}
                onPreview={setSelectedPreview}
              />
            </section>
          </>
        )}
      </PageLayout>
      <InterviewPreviewDialog
        preview={selectedPreview}
        onNavigate={(href) => {
          setSelectedPreview(null);
          navigateTo(href);
        }}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedPreview(null);
          }
        }}
      />
    </>
  );
}

function CurrentFocusPanel({ focus }: { focus: HomeDashboardFocus }) {
  return (
    <article className="overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 sm:p-6 lg:col-span-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:justify-between xl:gap-10">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge intent="brand">{focus.badgeLabel}</Badge>
            <span className="ui-metadata text-hypo-text-soft">
              {focus.stageLabel}
            </span>
          </div>
          <h2 className="mt-4 text-xl font-bold leading-7 text-hypo-text sm:text-[1.375rem]">
            {focus.title}
          </h2>
          <p className="ui-body mt-2 max-w-2xl text-hypo-text-muted">
            {focus.body}
          </p>

          <ol className="mt-6 grid grid-cols-4" aria-label="인터뷰 진행 단계">
            {focus.steps.map((step, index) => {
              const isComplete =
                focus.currentStep >= 0 && index < focus.currentStep;
              const isCurrent = index === focus.currentStep;

              return (
                <li className="relative min-w-0" key={step}>
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 right-1/2 top-[5px] h-px ${
                        isComplete || isCurrent
                          ? "bg-hypo-brand"
                          : "bg-hypo-border"
                      }`}
                    />
                  ) : null}
                  {index < focus.steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 right-0 top-[5px] h-px ${
                        isComplete ? "bg-hypo-brand" : "bg-hypo-border"
                      }`}
                    />
                  ) : null}
                  <div className="relative flex flex-col items-center text-center">
                    <span
                      aria-hidden="true"
                      className={`size-[11px] rounded-full border-2 ${
                        isComplete || isCurrent
                          ? "border-hypo-brand bg-hypo-brand"
                          : "border-hypo-border bg-white"
                      } ${isCurrent ? "ring-4 ring-hypo-accent/70" : ""}`}
                    />
                    <span
                      className={`ui-metadata mt-2 truncate px-1 ${
                        isCurrent ? "text-hypo-brand" : "text-hypo-text-soft"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="w-full border-t border-hypo-border/70 pt-5 xl:w-[250px] xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <p className="ui-label text-hypo-text">지금 확인할 내용</p>
          <button
            className="group mt-3 flex w-full items-center justify-between gap-3 rounded-hypo-md px-2 py-2 text-left transition-colors hover:bg-hypo-surface-muted/75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            onClick={() => navigateTo(focus.primaryAction.href)}
            type="button"
          >
            <span className="ui-row-title min-w-0 text-hypo-text">
              {focus.primaryAction.label}
            </span>
            <AppIcon
              className="shrink-0 text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
              name="chevron-right"
              size={17}
            />
          </button>
          {focus.secondaryAction ? (
            <button
              className="group flex w-full items-center justify-between gap-3 rounded-hypo-md px-2 py-2 text-left transition-colors hover:bg-hypo-surface-muted/75 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
              onClick={() => navigateTo(focus.secondaryAction?.href ?? "/chat")}
              type="button"
            >
              <span className="ui-row-title min-w-0 text-hypo-text">
                {focus.secondaryAction.label}
              </span>
              <AppIcon
                className="shrink-0 text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
                name="chevron-right"
                size={17}
              />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function NextSchedulePanel({
  schedule,
}: {
  schedule: HomeDashboardSchedule | null;
}) {
  if (!schedule) {
    return (
      <article className="flex min-h-[168px] flex-col justify-center rounded-hypo-lg border border-hypo-border bg-hypo-surface-muted/55 p-5 sm:p-6 lg:col-span-4">
        <div className="flex items-center gap-2 text-hypo-icon-muted">
          <AppIcon name="calendar" size={17} />
          <p className="ui-label text-hypo-text-muted">다음 일정</p>
        </div>
        <h2 className="mt-4 text-lg font-semibold leading-6 text-hypo-text">
          예정된 일정이 없어요
        </h2>
        <p className="ui-body mt-2 text-hypo-text-muted">
          일정이 잡히면 가장 가까운 참여 일정을 보여드릴게요.
        </p>
        <button
          className="mt-4 w-fit text-sm font-semibold text-hypo-brand transition-colors hover:text-hypo-brand-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          onClick={() => navigateTo("/interviews")}
          type="button"
        >
          공고 둘러보기
        </button>
      </article>
    );
  }

  return (
    <article className="flex min-h-[240px] flex-col justify-between rounded-hypo-lg bg-hypo-brand-strong p-5 text-white sm:p-6 lg:col-span-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="ui-label text-white/72">다음 일정</p>
          <span className="ui-badge-text rounded-hypo-md bg-white/12 px-2.5 py-1 text-white">
            {schedule.when}
          </span>
        </div>
        <h2 className="mt-5 text-xl font-bold leading-7 text-white">
          {schedule.interviewTitle}
        </h2>
        <p className="ui-body mt-2 text-white/72">{schedule.counterpart}</p>
      </div>

      <div className="mt-7">
        <div className="flex items-start gap-2 text-sm leading-5 text-white/80">
          <AppIcon className="mt-0.5 shrink-0" name="calendar" size={16} />
          <span>{schedule.location}</span>
        </div>
        <Button
          className="mt-5 w-full border-white/20 bg-white text-hypo-brand-strong hover:bg-white/90"
          size="sm"
          variant="secondary"
          onClick={() => navigateTo(schedule.href)}
        >
          채팅에서 확인하기
        </Button>
      </div>
    </article>
  );
}

function RecentInterviews({
  canApply,
  interviews,
  onPreview,
}: {
  canApply: boolean;
  interviews: HomeDashboardInterview[];
  onPreview: (preview: HomeInterviewPreview) => void;
}) {
  return (
    <section className="min-w-0 xl:col-span-8">
      <SectionHeading
        actionLabel={canApply ? "공고 더 보기" : "둘러보기"}
        title="최근 올라온 공고"
        onAction={() => navigateTo("/interviews")}
      />
      {interviews.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface">
          {interviews.map(({ post, secondaryMeta }) => (
            <button
              className="group grid min-h-[94px] w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-hypo-border px-4 py-4 text-left first:border-t-0 transition-colors hover:bg-hypo-surface-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-5"
              key={post.id}
              onClick={() =>
                onPreview({
                  description: post.service_summary,
                  href: `/interviews/${post.id}`,
                  metaLabels: secondaryMeta.split(" · "),
                  sourceLabel: "최근 올라온 공고",
                  targetDescription: post.target_description,
                  title: post.title,
                })
              }
              type="button"
            >
              <div className="min-w-0">
                <p className="ui-metadata text-hypo-text-soft">최근 등록</p>
                <h3 className="mt-1 text-[15px] font-semibold leading-6 text-hypo-text">
                  {post.title}
                </h3>
                <InterviewFounderByline post={post} />
              </div>
              <div className="flex items-center gap-3">
                <p className="ui-metadata text-right text-hypo-text-muted">
                  {secondaryMeta}
                </p>
                <AppIcon
                  className="shrink-0 text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
                  name="chevron-right"
                  size={17}
                />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4 min-h-[164px]"
          title="새로 올라온 공고가 없어요"
        >
          모집글이 등록되면 이곳에서 바로 확인할 수 있어요.
        </EmptyState>
      )}
    </section>
  );
}

function RecommendationSpotlight({
  recommendation,
  onPreview,
}: {
  recommendation: HomeDashboardRecommendation | null;
  onPreview: (preview: HomeInterviewPreview) => void;
}) {
  return (
    <section className="min-w-0 xl:col-span-4">
      <SectionHeading title="오늘의 추천" />
      {recommendation ? (
        <button
          className="group mt-4 flex w-full flex-col rounded-hypo-lg border border-hypo-brand/18 bg-hypo-surface p-5 text-left transition-[background-color,border-color] duration-150 hover:border-hypo-brand/35 hover:bg-hypo-brand-soft/35 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 sm:p-6 xl:min-h-[292px]"
          onClick={() =>
            onPreview({
              description: recommendation.post.service_summary,
              href: `/interviews/${recommendation.post.id}`,
              metaLabels: [
                formatCompensationSummary(normalizeCompensations(recommendation.post.compensations, recommendation.post.reward_amount)),
              ],
              sourceLabel: "오늘의 추천",
              targetDescription: recommendation.post.target_description,
              title: recommendation.post.title,
            })
          }
          type="button"
        >
          <div className="flex w-full items-center justify-between gap-4">
            <span className="ui-metadata font-semibold text-hypo-brand">
              모집 중
            </span>
            <span className="ui-metadata text-right text-hypo-text-muted">
              {formatInterviewPublishedTime(recommendation.post.created_at)}
            </span>
          </div>
          <h3 className="mt-7 text-xl font-bold leading-7 text-hypo-text">
            {recommendation.post.title}
          </h3>
          <p className="ui-body mt-3 text-hypo-text-muted">
            {recommendation.post.service_summary}
          </p>
          <InterviewFounderByline className="mt-5" post={recommendation.post} />
          <div className="mt-auto flex w-full items-end justify-between gap-4 pt-7">
            <div>
              <p className="ui-metadata text-hypo-text-muted">
                {recommendation.post.recruitment_type === "survey" ? "설문조사" : recommendation.post.recruitment_type === "beta_test" ? "베타테스트" : "인터뷰"} · {recommendation.post.duration_minutes}분
              </p>
              <strong className="mt-1 block text-[1.625rem] font-bold leading-8 text-hypo-brand-strong">
                {formatCompensationSummary(normalizeCompensations(recommendation.post.compensations, recommendation.post.reward_amount))}
              </strong>
            </div>
            <span className="ui-label inline-flex items-center gap-2 pb-1 text-hypo-text">
              살펴보기
              <AppIcon
                className="text-hypo-text-soft transition-transform group-hover:translate-x-0.5"
                name="chevron-right"
                size={16}
              />
            </span>
          </div>
        </button>
      ) : (
        <EmptyState
          className="mt-4 min-h-[220px] xl:min-h-[340px]"
          title="추천 공고를 찾고 있어요"
        >
          신청할 수 있는 새 모집글이 올라오면 한 건을 골라 보여드릴게요.
        </EmptyState>
      )}
    </section>
  );
}

function InterviewFounderByline({
  className = "mt-4",
  post,
}: {
  className?: string;
  post: HomeDashboardInterview["post"];
}) {
  const founderName = post.founder?.name?.trim();
  const organizationName = post.founder?.organization_name?.trim();
  if (!founderName) {
    return null;
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <Avatar
        alt={`${founderName} 프로필`}
        className="size-6"
        shape="circle"
        src={post.founder?.profile_image_url}
      />
      <span className="truncate text-xs font-medium leading-5 text-hypo-text-muted">
        {organizationName
          ? `${founderName} · ${organizationName}`
          : founderName}
      </span>
    </div>
  );
}

function HomeDashboardSkeleton() {
  return (
    <div
      aria-label="홈 정보를 불러오는 중"
      aria-busy="true"
      className="grid gap-7"
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="h-64 animate-pulse rounded-hypo-lg bg-hypo-surface-muted lg:col-span-8" />
        <div className="h-64 animate-pulse rounded-hypo-lg bg-hypo-brand-soft lg:col-span-4" />
      </div>
      <div className="grid gap-7 xl:grid-cols-12">
        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-8">
          {[0, 1, 2, 3].map((item) => (
            <div
              className="h-40 animate-pulse rounded-hypo-lg bg-hypo-surface-muted"
              key={item}
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-hypo-lg bg-hypo-surface-muted xl:col-span-4" />
      </div>
    </div>
  );
}

function SectionHeading({
  actionLabel,
  onAction,
  title,
}: {
  actionLabel?: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <header className="flex min-h-9 items-center justify-between gap-4">
      <h2 className="ui-section-title text-hypo-text">{title}</h2>
      {actionLabel && onAction ? (
        <button
          className="ui-label rounded-hypo-sm px-1 py-1 text-hypo-text-muted transition-colors hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
