package com.contentruck.hypofit.session.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.session.application.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.application.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.application.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.application.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.application.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.application.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.application.SessionReadModels;
import com.contentruck.hypofit.session.application.SessionWorkflowService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
        when(sessionWorkflowService.requireActiveUser(userId)).thenReturn(new ActiveUser(userId, "both"));
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
        InterviewPostRecord post = post(founderId);
        SessionWebModels.CreateSessionRequest request = new SessionWebModels.CreateSessionRequest(
                application.id(),
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        );

        when(sessionWorkflowService.requireActiveUser(founderId)).thenReturn(new ActiveUser(founderId, "founder"));
        when(sessionWorkflowService.getApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));
        when(sessionWorkflowService.createSession(
                application,
                post,
                request.scheduledAt(),
                request.meetingType(),
                request.meetingUrl(),
                request.place()
        )).thenReturn(sessionReadModel("scheduled"));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.InterviewSessionResponse response = controller.createSession(request, jwt(founderId));

        assertThat(response.status()).isEqualTo("scheduled");
        verify(sessionWorkflowService).requireFounderRole(new ActiveUser(founderId, "founder"));
    }

    @Test
    void createSessionRejectsUnselectedApplicationBeforeWorkflowCall() {
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "rejected");
        InterviewPostRecord post = post(founderId);
        SessionWebModels.CreateSessionRequest request = new SessionWebModels.CreateSessionRequest(
                application.id(),
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                null,
                null
        );

        when(sessionWorkflowService.requireActiveUser(founderId)).thenReturn(new ActiveUser(founderId, "founder"));
        when(sessionWorkflowService.getApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));

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
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord session = session("scheduled");
        when(sessionWorkflowService.requireActiveUser(founderId)).thenReturn(new ActiveUser(founderId, "founder"));
        when(sessionWorkflowService.getSessionContext(session.id()))
                .thenReturn(Optional.of(new SessionContext(session, application, post)));
        when(sessionWorkflowService.authorizeParticipant(any(), eq(application), eq(post))).thenReturn("founder");
        when(sessionWorkflowService.confirmAttendance(session, application, post, founderId, "founder"))
                .thenReturn(new SessionReadModels.ConfirmAttendanceReadModel(
                        sessionReadModel("scheduled"),
                        new SessionReadModels.AttendanceRecordReadModel(
                                session.id(),
                                true,
                                false,
                                OffsetDateTime.parse("2026-08-02T12:00:00Z"),
                                null,
                                null,
                                null
                        )
                ));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.ConfirmAttendanceResponse response = controller.confirmAttendance(session.id(), jwt(founderId));

        assertThat(response.attendance().founderConfirmed()).isTrue();
        verify(sessionWorkflowService).confirmAttendance(session, application, post, founderId, "founder");
    }

    @Test
    void createReviewUsesSessionContextAndAuthorizedActor() {
        UUID respondentId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(respondentId, "completed");
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord session = session("completed");
        when(sessionWorkflowService.requireActiveUser(respondentId)).thenReturn(new ActiveUser(respondentId, "respondent"));
        when(sessionWorkflowService.getSessionContext(session.id()))
                .thenReturn(Optional.of(new SessionContext(session, application, post)));
        when(sessionWorkflowService.authorizeParticipant(any(), eq(application), eq(post))).thenReturn("respondent");
        when(sessionWorkflowService.createReview(
                session,
                application,
                post,
                respondentId,
                "respondent",
                5,
                List.of("시간 준수", "친절해요"),
                "좋았어요."
        )).thenReturn(reviewReadModel(session.id(), respondentId, founderId));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        SessionWebModels.InterviewReviewResponse response = controller.createReview(
                session.id(),
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
        ApplicationRecord application = application(respondentId, "completed");
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord session = session("completed");
        when(sessionWorkflowService.requireActiveUser(respondentId)).thenReturn(new ActiveUser(respondentId, "respondent"));
        when(sessionWorkflowService.getSessionContext(session.id()))
                .thenReturn(Optional.of(new SessionContext(session, application, post)));
        when(sessionWorkflowService.authorizeParticipant(any(), eq(application), eq(post))).thenReturn("respondent");
        when(sessionWorkflowService.listReviews(session))
                .thenReturn(List.of(reviewReadModel(session.id(), respondentId, founderId)));

        SessionsController controller = new SessionsController(sessionWorkflowService);
        List<SessionWebModels.InterviewReviewResponse> response = controller.listReviews(session.id(), jwt(respondentId));

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

    private InterviewPostRecord post(UUID founderId) {
        return new InterviewPostRecord(
                UUID.randomUUID(),
                founderId,
                "인터뷰",
                15000
        );
    }

    private InterviewSessionRecord session(String status) {
        return new InterviewSessionRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                "online",
                null,
                null,
                status,
                "visible"
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
