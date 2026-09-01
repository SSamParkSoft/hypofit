package com.contentruck.hypofit.interview.controller;

import com.contentruck.hypofit.interview.dto.InterviewPostCreateRequest;
import com.contentruck.hypofit.interview.dto.InterviewPostResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.interview.service.InterviewAdminPolicy;
import com.contentruck.hypofit.interview.service.InterviewPostQueryService;
import com.contentruck.hypofit.interview.service.InterviewPostWriteService;
import com.contentruck.hypofit.interview.service.InterviewPostFixtures;
import com.contentruck.hypofit.interview.service.FounderReviewSummary;
import com.contentruck.hypofit.interview.service.FounderSummary;
import com.contentruck.hypofit.interview.service.InterviewAiSummaryReadModel;
import com.contentruck.hypofit.interview.service.InterviewPostReadModel;
import com.contentruck.hypofit.interview.service.InterviewSummaryContentModel;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class InterviewPostControllerTest {

    @Mock
    private InterviewPostQueryService interviewPostQueryService;

    @Mock
    private InterviewPostWriteService interviewPostWriteService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void listInterviewPostsUsesViewerVisibilityAndAdminPolicy() {
        UUID viewerId = UUID.randomUUID();
        InterviewAdminPolicy adminPolicy = "admin@example.com"::equals;
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(viewerId.toString())
                .claim("email", "admin@example.com")
                .build();
        when(interviewPostQueryService.listPosts(argThat(criteria ->
                criteria.viewerId().equals(viewerId)
                        && criteria.admin()
                        && criteria.supportsRecruitmentTypes()
        ))).thenReturn(List.of(InterviewPostFixtures.interviewPost(UUID.randomUUID())));

        InterviewPostController controller = new InterviewPostController(
                interviewPostQueryService,
                interviewPostWriteService,
                adminPolicy
        );
        List<InterviewPostResponse> response = controller.listInterviewPosts(
                jwt,
                "other-feature, recruitment-types-v1",
                "open",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "newest",
                100
        );

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().recruitmentType()).isEqualTo("interview");
        assertThat(response.getFirst().status()).isEqualTo("open");
    }

    @Test
    void getInterviewPostUsesOptionalViewer() {
        UUID postId = UUID.randomUUID();
        when(interviewPostQueryService.getVisiblePost(postId, null, false, false))
                .thenReturn(InterviewPostFixtures.interviewPost(postId));

        InterviewPostController controller = new InterviewPostController(
                interviewPostQueryService,
                interviewPostWriteService,
                email -> false
        );

        InterviewPostResponse response = controller.getInterviewPost(postId, null, null);

        assertThat(response.id()).isEqualTo(postId);
        assertThat(response.createdAt()).isEqualTo(OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC));
    }

    @Test
    void getInterviewPostIncludesFounderReviewSummary() {
        UUID postId = UUID.randomUUID();
        when(interviewPostQueryService.getVisiblePost(postId, null, false, false))
                .thenReturn(InterviewPostFixtures.interviewPost(postId));

        InterviewPostController controller = new InterviewPostController(
                interviewPostQueryService,
                interviewPostWriteService,
                email -> false
        );

        InterviewPostResponse response = controller.getInterviewPost(postId, null, null);

        assertThat(response.founderReviewSummary()).isNotNull();
        assertThat(response.founderReviewSummary().averageRating()).isEqualTo(5.0);
        assertThat(response.founderReviewSummary().reviewCount()).isEqualTo(1);
        assertThat(response.founder()).isNotNull();
        assertThat(response.founder().organizationType()).isEqualTo("team");
        assertThat(response.founder().organizationName()).isEqualTo("콘텐츠럭");
        assertThat(response.createdAt())
                .isEqualTo(OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC));
    }

    @Test
    void getInterviewPostIncludesAiSummaryWhenPresent() {
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(interviewPostQueryService.getVisiblePost(postId, null, false, false))
                .thenReturn(new InterviewPostReadModel(
                        postId,
                        founderId,
                        "interview",
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
                        OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC),
                        new FounderSummary(founderId, "테스트 사용자", null, "founder", null, "team", "콘텐츠럭"),
                        new FounderReviewSummary(5.0, 1, OffsetDateTime.of(2026, 7, 31, 18, 0, 0, 0, ZoneOffset.UTC)),
                        null,
                        new InterviewAiSummaryReadModel(
                                "ready",
                                new InterviewSummaryContentModel(
                                        "무엇을 검증하려는지 짧게 정리했어요.",
                                        "최근 운동 앱 사용 중단 경험자",
                                        List.of("평일 저녁 30분")
                                ),
                                OffsetDateTime.of(2026, 8, 8, 12, 0, 0, 0, ZoneOffset.UTC)
                        )
                ));

        InterviewPostController controller = new InterviewPostController(
                interviewPostQueryService,
                interviewPostWriteService,
                email -> false
        );

        InterviewPostResponse response = controller.getInterviewPost(postId, null, null);

        assertThat(response.aiSummary()).isNotNull();
        assertThat(response.createdAt()).isEqualTo(OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC));
        assertThat(response.aiSummary().status()).isEqualTo("ready");
        assertThat(response.aiSummary().content()).isNotNull();
        assertThat(response.aiSummary().content().keyPoints()).containsExactly("평일 저녁 30분");
    }

    @Test
    void createInterviewPostDelegatesToWriteService() throws Exception {
        UUID actorUserId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(actorUserId.toString())
                .claim("email", "founder@example.com")
                .build();
        when(interviewPostWriteService.createPost(eq(actorUserId), argThat(command ->
                "interview".equals(command.recruitmentType())
                        && command.title().equals("인터뷰 모집")
                        && command.rewardAmount() == 15000
                        && command.status().equals("open")
        ), eq(null))).thenReturn(InterviewPostFixtures.interviewPost(postId));

        InterviewPostController controller = new InterviewPostController(
                interviewPostQueryService,
                interviewPostWriteService,
                email -> false
        );

        InterviewPostResponse response = controller.createInterviewPost(
                jwt,
                objectMapper.readValue("""
                        {
                          "title": "인터뷰 모집",
                          "service_summary": "초기 서비스 문제를 검증하려는 인터뷰입니다.",
                          "target_description": "최근 3개월 내 관련 경험자",
                          "reward_amount": 15000,
                          "duration_minutes": 30,
                          "interview_mode": "online",
                          "schedule_options": ["평일 저녁"],
                          "status": "open"
                        }
                        """, InterviewPostCreateRequest.class)
        );

        assertThat(response.id()).isEqualTo(postId);
        assertThat(response.status()).isEqualTo("open");
        assertThat(response.createdAt()).isEqualTo(OffsetDateTime.of(2026, 8, 1, 9, 30, 0, 0, ZoneOffset.UTC));
    }
}
