package com.contentruck.hypofit.session.controller;

import com.contentruck.hypofit.session.dto.SessionRequestValidationException;
import com.contentruck.hypofit.session.dto.SessionWebModels;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionReadModels;
import com.contentruck.hypofit.session.service.SessionWorkflowService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;

@ExtendWith(MockitoExtension.class)
class SessionsControllerTest {

    @Mock
    private SessionWorkflowService sessionWorkflowService;

    @Test
    void listSessionsUsesJwtSubject() {
        UUID userId = UUID.randomUUID();
        when(sessionWorkflowService.listSessions(userId)).thenReturn(List.of(sessionReadModel("scheduled")));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        List<SessionWebModels.InterviewSessionResponse> response = controller.listSessions(jwt(userId));

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().status()).isEqualTo("scheduled");
    }

    @Test
    void createSessionPrechecksFounderOwnershipAndSelection() {
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        SessionWebModels.CreateSessionRequest request = new SessionWebModels.CreateSessionRequest(
                application.id(),
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        );

        when(sessionWorkflowService.createSession(
                founderId,
                application.id(),
                request.scheduledAt(),
                request.meetingType(),
                request.meetingUrl(),
                request.place()
        )).thenReturn(sessionReadModel("scheduled"));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.InterviewSessionResponse response = controller.createSession(request, jwt(founderId));

        assertThat(response.status()).isEqualTo("scheduled");
    }

    @Test
    void createSessionRejectsUnselectedApplicationBeforeWorkflowCall() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        SessionWebModels.CreateSessionRequest request = new SessionWebModels.CreateSessionRequest(
                applicationId,
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                null,
                null
        );

        when(sessionWorkflowService.createSession(
                founderId,
                applicationId,
                request.scheduledAt(),
                request.meetingType(),
                request.meetingUrl(),
                request.place()
        )).thenThrow(new HypofitException(
                "only_selected_applications_can_be_scheduled",
                "Only selected applications can be scheduled",
                400,
                "Only selected applications can be scheduled"
        ));

        SessionsController controller = new SessionsController(sessionWorkflowService);

        assertThatThrownBy(() -> controller.createSession(request, jwt(founderId)))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "code", "debugMessage")
                .containsExactly(400, "only_selected_applications_can_be_scheduled", "Only selected applications can be scheduled");
    }

    @Test
    void updateSessionValidatesPatchBeforeCallingService() {
        UUID userId = UUID.randomUUID();
        SessionWebModels.UpdateSessionRequest request = new SessionWebModels.UpdateSessionRequest();

        SessionsController controller = new SessionsController(sessionWorkflowService);

        assertThatThrownBy(() -> controller.updateSession(UUID.randomUUID(), request, jwt(userId)))
                .isInstanceOf(SessionRequestValidationException.class);
    }

    @Test
    void confirmAttendanceForwardsAuthorizedActor() {
        UUID founderId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(sessionWorkflowService.confirmAttendance(founderId, sessionId))
                .thenReturn(new SessionReadModels.ConfirmAttendanceReadModel(
                        sessionReadModel("scheduled"),
                        new SessionReadModels.AttendanceRecordReadModel(
                                sessionId,
                                true,
                                false,
                                OffsetDateTime.parse("2026-08-02T12:00:00Z"),
                                null,
                                null,
                                null
                        )
                ));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.ConfirmAttendanceResponse response = controller.confirmAttendance(sessionId, jwt(founderId));

        assertThat(response.attendance().founderConfirmed()).isTrue();
        verify(sessionWorkflowService).confirmAttendance(founderId, sessionId);
    }

    @Test
    void createReviewUsesSessionContextAndAuthorizedActor() {
        UUID respondentId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(sessionWorkflowService.createReview(
                respondentId,
                sessionId,
                5,
                List.of("시간 준수", "친절해요"),
                "좋았어요."
        )).thenReturn(reviewReadModel(sessionId, respondentId, founderId));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.InterviewReviewResponse response = controller.createReview(
                sessionId,
                new SessionWebModels.ReviewCreateRequest(5, List.of("시간 준수", "친절해요"), "좋았어요."),
                jwt(respondentId)
        );

        assertThat(response.rating()).isEqualTo(5);
        assertThat(response.reviewerRole()).isEqualTo("respondent");
    }

    @Test
    void listReviewsUsesAuthorizedSessionContext() {
        UUID respondentId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        when(sessionWorkflowService.listReviews(respondentId, sessionId))
                .thenReturn(List.of(reviewReadModel(sessionId, respondentId, founderId)));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        List<SessionWebModels.InterviewReviewResponse> response = controller.listReviews(sessionId, jwt(respondentId));

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().revieweeId()).isEqualTo(founderId);
        assertThat(response.getFirst().tags()).containsExactly("시간 준수", "친절해요");
    }

    private Jwt jwt(UUID userId) {
        return Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject(userId.toString())
                .claim("email", "user@example.com")
                .build();
    }

    private ApplicationRecord application(UUID respondentId, String status) {
        return new ApplicationRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                respondentId,
                Map.of("motivation", "테스트"),
                List.of("평일 저녁"),
                status,
                "visible",
                null
        );
    }

    private SessionReadModels.InterviewSessionReadModel sessionReadModel(String status) {
        return new SessionReadModels.InterviewSessionReadModel(
                UUID.randomUUID(),
                UUID.randomUUID(),
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null,
                status,
                null
        );
    }

    private SessionReadModels.InterviewReviewReadModel reviewReadModel(UUID sessionId, UUID reviewerId, UUID revieweeId) {
        return new SessionReadModels.InterviewReviewReadModel(
                UUID.randomUUID(),
                sessionId,
                reviewerId,
                revieweeId,
                "respondent",
                5,
                List.of("시간 준수", "친절해요"),
                "좋았어요.",
                "private",
                OffsetDateTime.parse("2026-08-02T12:00:00Z"),
                OffsetDateTime.parse("2026-08-02T12:10:00Z")
        );
    }
}
