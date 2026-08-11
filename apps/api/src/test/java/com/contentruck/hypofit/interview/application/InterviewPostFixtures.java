package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.interview.domain.FounderReviewSummary;
import com.contentruck.hypofit.interview.domain.FounderSummary;
import com.contentruck.hypofit.interview.domain.InterviewPostReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

public final class InterviewPostFixtures {

    private InterviewPostFixtures() {
    }

    public static InterviewPostReadModel interviewPost(UUID postId) {
        UUID founderId = UUID.randomUUID();
        return new InterviewPostReadModel(
                postId,
                founderId,
                "인터뷰 모집",
                "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                "최근 3개월 내 관련 경험자",
                15000,
                30,
                0,
                "online",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of("평일 저녁"),
                "open",
                new FounderSummary(founderId, "테스트 사용자", null, "founder", null),
                new FounderReviewSummary(5.0, 1, OffsetDateTime.of(2026, 7, 31, 18, 0, 0, 0, ZoneOffset.UTC)),
                null
        );
    }
}
