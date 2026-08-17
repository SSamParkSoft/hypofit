package com.contentruck.hypofit.applicant.controller;

import com.contentruck.hypofit.applicant.dto.ApplicationCreateRequest;
import com.contentruck.hypofit.applicant.dto.ApplicationResponse;
import com.contentruck.hypofit.applicant.dto.ApplicationStatusUpdateRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.applicant.service.ApplicantAiSummaryReadModel;
import com.contentruck.hypofit.applicant.service.ApplicantSummaryContentModel;
import com.contentruck.hypofit.applicant.service.ApplicationReadModel;
import com.contentruck.hypofit.applicant.service.ApplicationRespondentSummary;
import com.contentruck.hypofit.applicant.service.ApplicationWorkflowService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class ApplicationControllerTest {

    @Mock
    private ApplicationWorkflowService applicationWorkflowService;

    @Test
    void getApplicationDetailUsesJwtSubjectAsViewer() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
        when(applicationWorkflowService.getApplicationDetail(userId, applicationId))
                .thenReturn(readModel(UUID.randomUUID(), userId, "applied", null, null));

        ApplicationController controller = new ApplicationController(applicationWorkflowService);
        ApplicationResponse response = controller.getApplicationDetail(jwt, applicationId);

        assertThat(response.respondentId()).isEqualTo(userId);
        assertThat(response.aiSummary()).isNull();
    }

    @Test
    void getApplicationDetailIncludesAiSummaryForFounderView() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(founderId.toString())
                .claim("email", "founder@example.com")
                .build();
        ApplicantAiSummaryReadModel aiSummary = new ApplicantAiSummaryReadModel(
                "ready",
                new ApplicantSummaryContentModel(
                        "운동 앱 사용 경험을 구체적으로 적었어요.",
                        List.of("홈트 앱 2종 사용"),
                        "평일 저녁 가능",
                        List.of("최근 중단 이유 확인")
                ),
                OffsetDateTime.of(2026, 8, 8, 12, 0, 0, 0, ZoneOffset.UTC)
        );
        when(applicationWorkflowService.getApplicationDetail(founderId, applicationId))
                .thenReturn(readModel(UUID.randomUUID(), UUID.randomUUID(), "applied", null, aiSummary));

        ApplicationController controller = new ApplicationController(applicationWorkflowService);
        ApplicationResponse response = controller.getApplicationDetail(jwt, applicationId);

        assertThat(response.aiSummary()).isNotNull();
        assertThat(response.aiSummary().status()).isEqualTo("ready");
        assertThat(response.aiSummary().content()).isNotNull();
        assertThat(response.aiSummary().content().relevantExperience()).containsExactly("홈트 앱 2종 사용");
    }

    @Test
    void listApplicationsUsesJwtSubjectAsUserId() {
        UUID userId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
        when(applicationWorkflowService.listApplications(userId))
                .thenReturn(List.of(readModel(userId, "applied")));

        ApplicationController controller = new ApplicationController(applicationWorkflowService);
        List<ApplicationResponse> response = controller.listApplications(jwt);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().respondentId()).isEqualTo(userId);
    }

    @Test
    void createApplicationPassesNormalizedPayloadToService() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
        when(applicationWorkflowService.createApplication(
                eq(userId),
                eq(postId),
                eq(Map.of("experience", "yes")),
                eq(List.of("평일 저녁"))
        )).thenReturn(readModel(postId, userId, "applied", null, null));

        ApplicationController controller = new ApplicationController(applicationWorkflowService);
        ApplicationResponse response = controller.createApplication(
                jwt,
                new ApplicationCreateRequest(postId, Map.of("experience", "yes"), List.of("평일 저녁"))
        );

        assertThat(response.interviewPostId()).isEqualTo(postId);
        assertThat(response.status()).isEqualTo("applied");
    }

    @Test
    void updateApplicationStatusValidatesBeforeDelegating() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(founderId.toString())
                .claim("email", "founder@example.com")
                .build();
        when(applicationWorkflowService.updateApplicationStatus(
                founderId,
                applicationId,
                "rejected",
                "일정이 맞지 않아요"
        )).thenReturn(readModel(UUID.randomUUID(), founderId, "rejected", "일정이 맞지 않아요", null));

        ApplicationController controller = new ApplicationController(applicationWorkflowService);
        ApplicationResponse response = controller.updateApplicationStatus(
                jwt,
                applicationId,
                new ApplicationStatusUpdateRequest("rejected", " 일정이 맞지 않아요 ")
        );

        assertThat(response.status()).isEqualTo("rejected");
        assertThat(response.rejectionReason()).isEqualTo("일정이 맞지 않아요");
    }

    private ApplicationReadModel readModel(UUID respondentId, String status) {
        return readModel(UUID.randomUUID(), respondentId, status, null, null);
    }

    private ApplicationReadModel readModel(UUID respondentId, String status, String rejectionReason) {
        return readModel(UUID.randomUUID(), respondentId, status, rejectionReason, null);
    }

    private ApplicationReadModel readModel(
            UUID interviewPostId,
            UUID respondentId,
            String status,
            String rejectionReason,
            ApplicantAiSummaryReadModel aiSummary
    ) {
        return new ApplicationReadModel(
                UUID.randomUUID(),
                interviewPostId,
                Map.of("experience", "yes"),
                List.of("평일 저녁"),
                respondentId,
                status,
                rejectionReason,
                new ApplicationRespondentSummary(
                        respondentId,
                        "응답자",
                        null,
                        "respondent",
                        "https://example.com/respondent.png"
                ),
                aiSummary
        );
    }
}
