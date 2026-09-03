package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.session.service.SessionContexts.ActiveUser;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.AttendanceRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewPostRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewReviewRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionContexts.StoredUser;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SessionWorkflowServiceTest {

    @Mock
    private SessionWorkflowRepository repository;

    @Mock
    private AuditWriteService auditWriteService;

    @Mock
    private NotificationWriteService notificationWriteService;

    private SessionWorkflowService service;

    @BeforeEach
    void setUp() {
        SessionWorkflowAccessService accessService = new SessionWorkflowAccessService(repository);
        SessionLifecycleNotificationService notificationService = new SessionLifecycleNotificationService(
                repository,
                notificationWriteService
        );
        service = new SessionWorkflowService(
                repository,
                accessService,
                new SessionSchedulingService(
                        repository,
                        accessService,
                        auditWriteService,
                        notificationService
                ),
                new SessionAttendanceService(repository, accessService, auditWriteService, notificationService),
                new SessionRewardService(repository, accessService, auditWriteService, notificationService),
                new SessionReviewService(repository, accessService, auditWriteService, notificationService)
        );
        lenient().when(repository.saveSession(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.saveAttendanceRecord(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.saveRewardConfirmation(any())).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(repository.saveReview(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void requireActiveUserRejectsMissingDeletedAndDeactivatedProfiles() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireActiveUser(userId))
                .isInstanceOf(HypofitException.class)
                .extracting("code", "status")
                .containsExactly("profile_missing", 403);

        StoredUser deleted = user(userId, "both", OffsetDateTime.now(ZoneOffset.UTC), null);
        when(repository.findUserById(userId)).thenReturn(Optional.of(deleted));

        assertThatThrownBy(() -> service.requireActiveUser(userId))
                .isInstanceOf(HypofitException.class)
                .extracting("code", "status")
                .containsExactly("account_deleted", 403);

        StoredUser deactivated = user(userId, "both", null, OffsetDateTime.now(ZoneOffset.UTC));
        when(repository.findUserById(userId)).thenReturn(Optional.of(deactivated));

        assertThatThrownBy(() -> service.requireActiveUser(userId))
                .isInstanceOf(HypofitException.class)
                .extracting("code", "status")
                .containsExactly("account_deactivated", 403);
    }

    @Test
    void authorizeParticipantUsesMembershipInsteadOfCustomerRole() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId);

        assertThat(service.authorizeParticipant(new ActiveUser(founderId, "founder"), application, post))
                .isEqualTo("founder");
        assertThat(service.authorizeParticipant(new ActiveUser(respondentId, "respondent"), application, post))
                .isEqualTo("respondent");
        assertThat(service.authorizeParticipant(new ActiveUser(respondentId, "founder"), application, post))
                .isEqualTo("respondent");
        assertThat(service.authorizeParticipant(new ActiveUser(founderId, "respondent"), application, post))
                .isEqualTo("founder");

        assertThatThrownBy(() -> service.authorizeParticipant(new ActiveUser(UUID.randomUUID(), "both"), application, post))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(403, "Forbidden");
    }

    @Test
    void createSessionConflictsWhenLockedApplicationStateChanges() {
        UUID founderId = UUID.randomUUID();
        ApplicationRecord initialApplication = application(UUID.randomUUID(), "selected");
        InterviewPostRecord post = post(founderId);
        ApplicationRecord lockedApplication = new ApplicationRecord(
                initialApplication.id(),
                initialApplication.interviewPostId(),
                initialApplication.respondentId(),
                initialApplication.answers(),
                initialApplication.availableTimes(),
                "rejected",
                initialApplication.moderationStatus(),
                initialApplication.rejectionReason()
        );

        when(repository.lockApplicationContext(initialApplication.id()))
                .thenReturn(Optional.of(new ApplicationContext(lockedApplication, post)));

        assertThatThrownBy(() -> service.createSession(
                initialApplication,
                post,
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "Only selected applications can be scheduled");
    }

    @Test
    void createSessionForActorRejectsForeignFounderBeforeLocking() {
        UUID actorUserId = UUID.randomUUID();
        UUID actualFounderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        InterviewPostRecord post = post(actualFounderId);

        when(repository.findUserById(actorUserId)).thenReturn(Optional.of(user(actorUserId, "founder", null, null)));
        when(repository.findApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));

        assertThatThrownBy(() -> service.createSession(
                actorUserId,
                application.id(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(403, "Forbidden");

        verify(repository, never()).lockApplicationContext(application.id());
    }

    @Test
    void createSessionForActorAllowsRespondentRoleWhenUserOwnsPost() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord saved = new InterviewSessionRecord(
                UUID.randomUUID(),
                application.id(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null,
                "scheduled",
                "visible"
        );

        when(repository.findUserById(founderId)).thenReturn(Optional.of(user(founderId, "respondent", null, null)));
        when(repository.findApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));
        when(repository.lockApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));
        when(repository.hasScheduledVisibleSessionForApplication(application.id())).thenReturn(false);
        when(repository.saveSession(any())).thenReturn(saved);

        SessionReadModels.InterviewSessionReadModel result = service.createSession(
                founderId,
                application.id(),
                saved.scheduledAt(),
                saved.meetingType(),
                saved.meetingUrl(),
                saved.place()
        );

        assertThat(result.id()).isEqualTo(saved.id());
        assertThat(result.status()).isEqualTo("scheduled");
    }

    @Test
    void createSessionRejectsDuplicateScheduledSessionForApplication() {
        UUID respondentId = UUID.randomUUID();
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(UUID.randomUUID());

        when(repository.lockApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));
        when(repository.hasScheduledVisibleSessionForApplication(application.id())).thenReturn(true);

        assertThatThrownBy(() -> service.createSession(
                application,
                post,
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "A scheduled session already exists for this application");

        verify(repository, never()).saveSession(any());
    }

    @Test
    void createSessionForActorRejectsUnselectedApplicationBeforeLocking() {
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "rejected");
        InterviewPostRecord post = post(founderId);

        when(repository.findUserById(founderId)).thenReturn(Optional.of(user(founderId, "founder", null, null)));
        when(repository.findApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));

        assertThatThrownBy(() -> service.createSession(
                founderId,
                application.id(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(400, "Only selected applications can be scheduled");

        verify(repository, never()).lockApplicationContext(application.id());
    }

    @Test
    void createSessionRejectsNonInterviewRecruitmentTypeAtApplicationContextBoundary() {
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        InterviewPostRecord post = post(founderId, "beta_test");

        when(repository.findUserById(founderId)).thenReturn(Optional.of(user(founderId, "founder", null, null)));
        when(repository.findApplicationContext(application.id()))
                .thenReturn(Optional.of(new ApplicationContext(application, post)));

        assertThatThrownBy(() -> service.createSession(
                founderId,
                application.id(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/1",
                null
        )).isInstanceOf(HypofitException.class)
                .extracting("code", "status")
                .containsExactly("recruitment_type_action_not_allowed", 400);

        verify(repository, never()).lockApplicationContext(application.id());
    }

    @Test
    void confirmAttendanceRejectsNonInterviewRecruitmentTypeAtSessionContextBoundary() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("scheduled");
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId, "beta_test");

        when(repository.findUserById(founderId)).thenReturn(Optional.of(user(founderId, "founder", null, null)));
        when(repository.findSessionContext(interviewSession.id()))
                .thenReturn(Optional.of(new SessionContext(interviewSession, application, post)));

        assertThatThrownBy(() -> service.confirmAttendance(founderId, interviewSession.id()))
                .isInstanceOf(HypofitException.class)
                .extracting("code", "status")
                .containsExactly("recruitment_type_action_not_allowed", 400);
    }

    @Test
    void updateSessionClearsCounterpartFieldWhenMeetingTypeChanges() {
        InterviewSessionRecord interviewSession = new InterviewSessionRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                "https://meet.example.com/room",
                "강남역",
                "scheduled",
                "visible"
        );

        SessionReadModels.InterviewSessionReadModel result = service.updateSession(
                interviewSession,
                application(UUID.randomUUID(), "selected"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "founder",
                " 시간을 다시 맞췄어요. ",
                null,
                false,
                "offline",
                true,
                null,
                false,
                null,
                false
        );

        assertThat(result.meetingType()).isEqualTo("offline");
        assertThat(result.meetingUrl()).isNull();
        assertThat(result.place()).isEqualTo("강남역");
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("interview_session_rescheduled");
        assertThat(audit.reason()).isEqualTo("시간을 다시 맞췄어요.");
        assertThat(audit.before()).containsEntry("meeting_type", "online");
        assertThat(audit.after()).containsEntry("meeting_type", "offline");
        assertThat(audit.metadata()).containsEntry("actor_role", "founder");
    }

    @Test
    void updateSessionRejectsSelectedApplicantBeforeAnyWrite() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("scheduled");
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId);

        when(repository.findUserById(respondentId))
                .thenReturn(Optional.of(user(respondentId, "both", null, null)));
        when(repository.findSessionContext(interviewSession.id()))
                .thenReturn(Optional.of(new SessionContext(interviewSession, application, post)));

        assertThatThrownBy(() -> service.updateSession(
                respondentId,
                interviewSession.id(),
                null,
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                true,
                null,
                false,
                null,
                false,
                null,
                false
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(403, "Only the post owner can update a session");

        verify(repository, never()).saveSession(any());
        verify(auditWriteService, never()).record(any());
        verify(notificationWriteService, never()).createNotification(
                any(), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    void updateSessionRejectsNonScheduledSessionBeforeAnyWrite() {
        InterviewSessionRecord interviewSession = session("completed");

        assertThatThrownBy(() -> service.updateSession(
                interviewSession,
                application(UUID.randomUUID(), "completed"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "founder",
                null,
                OffsetDateTime.parse("2026-08-02T10:00:00Z"),
                true,
                null,
                false,
                null,
                false,
                null,
                false
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(400, "Only scheduled sessions can be updated");

        verify(repository, never()).saveSession(any());
        verify(auditWriteService, never()).record(any());
        verify(notificationWriteService, never()).createNotification(
                any(), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    void confirmAttendanceCompletesSessionAndCreatesReward() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("scheduled");
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId);
        AttendanceRecord attendance = attendance(interviewSession.id(), true, false);

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findAttendanceRecord(interviewSession.id())).thenReturn(Optional.of(attendance));
        when(repository.updateApplicationStatusIfCurrent(application.id(), "completed", Set.of("selected"))).thenReturn(true);
        when(repository.findRewardConfirmation(interviewSession.id())).thenReturn(Optional.empty());
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.ConfirmAttendanceReadModel result = service.confirmAttendance(
                interviewSession,
                application,
                post,
                respondentId,
                "respondent"
        );

        assertThat(result.session().status()).isEqualTo("completed");
        assertThat(result.attendance().founderConfirmed()).isTrue();
        assertThat(result.attendance().respondentConfirmed()).isTrue();
        verify(repository).saveRewardConfirmation(any(RewardConfirmationRecord.class));
        verify(repository).updateApplicationStatusIfCurrent(application.id(), "completed", Set.of("selected"));
        verify(notificationWriteService).createNotification(eq(founderId), eq("session_completed"), eq("인터뷰가 완료됐어요"), any(), any(), any(), any());
        verify(notificationWriteService).createNotification(eq(respondentId), eq("session_completed"), eq("인터뷰가 완료됐어요"), any(), any(), any(), any());
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("interview_session_attendance_confirmed");
        assertThat(audit.before()).containsEntry("status", "scheduled");
        assertThat(audit.after())
                .containsEntry("status", "completed")
                .containsEntry("founder_confirmed", true)
                .containsEntry("respondent_confirmed", true);
        assertThat(audit.metadata())
                .containsEntry("actor_role", "respondent")
                .containsEntry("completed_now", true);
    }

    @Test
    void confirmAttendanceRejectsNonScheduledLockedSession() {
        InterviewSessionRecord interviewSession = session("completed");
        ApplicationRecord application = application(UUID.randomUUID(), "completed");
        InterviewPostRecord post = post(UUID.randomUUID());

        stubLockedSessionContext(interviewSession, application, post);

        assertThatThrownBy(() -> service.confirmAttendance(
                interviewSession,
                application,
                post,
                post.founderId(),
                "founder"
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(400, "Only scheduled sessions can be confirmed");

        verify(repository, never()).saveAttendanceRecord(any());
        verify(repository, never()).saveSession(any());
        verify(auditWriteService, never()).record(any());
    }

    @Test
    void confirmAttendanceKeepsSessionScheduledUntilCounterpartAlsoConfirms() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("scheduled");
        ApplicationRecord application = application(respondentId, "selected");
        InterviewPostRecord post = post(founderId);

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findAttendanceRecord(interviewSession.id()))
                .thenReturn(Optional.of(attendance(interviewSession.id(), false, false)));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.ConfirmAttendanceReadModel result = service.confirmAttendance(
                interviewSession,
                application,
                post,
                founderId,
                "founder"
        );

        assertThat(result.session().status()).isEqualTo("scheduled");
        assertThat(result.attendance().founderConfirmed()).isTrue();
        assertThat(result.attendance().respondentConfirmed()).isFalse();
        verify(repository, never()).saveSession(any());
        verify(repository, never()).updateApplicationStatusIfCurrent(any(), any(), any());
        verify(repository, never()).saveRewardConfirmation(any());
        verify(notificationWriteService).createNotification(
                eq(respondentId),
                eq("attendance_confirmation_requested"),
                eq("만남 확인이 필요해요"),
                any(),
                any(),
                any(),
                any()
        );
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        assertThat(auditCaptor.getValue().metadata())
                .containsEntry("actor_role", "founder")
                .containsEntry("completed_now", false);
    }

    @Test
    void markRewardPaidKeepsFounderMarkedPaidStateIdempotent() {
        InterviewSessionRecord interviewSession = session("completed");
        ApplicationRecord application = application(UUID.randomUUID(), "completed");
        InterviewPostRecord post = post(UUID.randomUUID());
        RewardConfirmationRecord reward = reward(interviewSession.id(), application.id(), post.founderId(), application.respondentId(), "founder_marked_paid");

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findRewardConfirmation(interviewSession.id())).thenReturn(Optional.of(reward));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.RewardConfirmationReadModel result = service.markRewardPaid(
                interviewSession,
                application,
                post,
                post.founderId(),
                "founder"
        );

        assertThat(result.status()).isEqualTo("founder_marked_paid");
        assertThat(result.founderMarkedPaidAt()).isNotNull();
        verify(notificationWriteService).createNotification(
                eq(application.respondentId()),
                eq("reward_marked_paid"),
                eq("사례비 지급 확인이 필요해요"),
                any(),
                any(),
                any(),
                any()
        );
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("reward_marked_paid");
        assertThat(audit.targetType()).isEqualTo("reward_confirmation");
        assertThat(audit.metadata()).containsEntry("actor_role", "founder");
    }

    @Test
    void confirmRewardReceivedRejectsUnexpectedRewardState() {
        InterviewSessionRecord interviewSession = session("completed");
        RewardConfirmationRecord reward = reward(
                interviewSession.id(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "pending"
        );

        stubLockedSessionContext(interviewSession, application(UUID.randomUUID(), "completed"), post(UUID.randomUUID()));
        when(repository.findRewardConfirmation(interviewSession.id())).thenReturn(Optional.of(reward));

        assertThatThrownBy(() -> service.confirmRewardReceived(
                interviewSession,
                application(UUID.randomUUID(), "completed"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "respondent"
        ))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "Reward is not ready for confirmation");
    }

    @Test
    void confirmRewardReceivedRecordsAudit() {
        UUID actorUserId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("completed");
        ApplicationRecord application = application(actorUserId, "completed");
        InterviewPostRecord post = post(UUID.randomUUID());
        RewardConfirmationRecord reward = reward(
                interviewSession.id(),
                application.id(),
                post.founderId(),
                actorUserId,
                "founder_marked_paid"
        );

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findRewardConfirmation(interviewSession.id())).thenReturn(Optional.of(reward));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.RewardConfirmationReadModel result = service.confirmRewardReceived(
                interviewSession,
                application,
                post,
                actorUserId,
                "respondent"
        );

        assertThat(result.status()).isEqualTo("respondent_confirmed");
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("reward_received_confirmed");
        assertThat(audit.before()).containsEntry("status", "founder_marked_paid");
        assertThat(audit.after()).containsEntry("status", "respondent_confirmed");
        assertThat(audit.metadata()).containsEntry("actor_role", "respondent");
    }

    @Test
    void disputeRewardRecordsAuditWithReason() {
        UUID actorUserId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("completed");
        ApplicationRecord application = application(actorUserId, "completed");
        InterviewPostRecord post = post(UUID.randomUUID());
        RewardConfirmationRecord reward = reward(
                interviewSession.id(),
                application.id(),
                post.founderId(),
                actorUserId,
                "founder_marked_paid"
        );

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findRewardConfirmation(interviewSession.id())).thenReturn(Optional.of(reward));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.RewardConfirmationReadModel result = service.disputeReward(
                interviewSession,
                application,
                post,
                actorUserId,
                "respondent",
                " 아직 못 받았어요. "
        );

        assertThat(result.status()).isEqualTo("disputed");
        assertThat(result.disputeReason()).isEqualTo("아직 못 받았어요.");
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("reward_disputed");
        assertThat(audit.reason()).isEqualTo("아직 못 받았어요.");
        assertThat(audit.before()).containsEntry("status", "founder_marked_paid");
        assertThat(audit.after()).containsEntry("status", "disputed");
    }

    @Test
    void cancelSessionRejectsStaleTransitionBeforeReload() {
        InterviewSessionRecord interviewSession = session("scheduled");
        when(repository.updateScheduledSessionStatus(interviewSession.id(), "canceled")).thenReturn(false);

        assertThatThrownBy(() -> service.cancelSession(
                interviewSession,
                application(UUID.randomUUID(), "selected"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "respondent",
                "취소해요"
        ))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "Interview session status has already changed");

        verify(repository, never()).findSessionContext(any());
    }

    @Test
    void cancelSessionRejectsNonScheduledSessionBeforeAnyWrite() {
        InterviewSessionRecord interviewSession = session("completed");

        assertThatThrownBy(() -> service.cancelSession(
                interviewSession,
                application(UUID.randomUUID(), "completed"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "respondent",
                "취소해요"
        ))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(400, "Only scheduled sessions can be canceled");

        verify(repository, never()).updateScheduledSessionStatus(any(), any());
        verify(auditWriteService, never()).record(any());
        verify(notificationWriteService, never()).createNotification(
                any(), any(), any(), any(), any(), any(), any()
        );
    }

    @Test
    void cancelSessionRecordsAuditAndUsesReasonInNotification() {
        UUID actorUserId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord interviewSession = session("scheduled");
        InterviewSessionRecord canceled = new InterviewSessionRecord(
                interviewSession.id(),
                interviewSession.applicationId(),
                interviewSession.scheduledAt(),
                interviewSession.meetingType(),
                interviewSession.meetingUrl(),
                interviewSession.place(),
                "canceled",
                interviewSession.moderationStatus()
        );

        when(repository.updateScheduledSessionStatus(interviewSession.id(), "canceled")).thenReturn(true);
        when(repository.findSessionContext(interviewSession.id()))
                .thenReturn(Optional.of(new SessionContext(canceled, application, post)));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.InterviewSessionReadModel result = service.cancelSession(
                interviewSession,
                application,
                post,
                actorUserId,
                "respondent",
                " 개인 사정으로 어렵습니다. "
        );

        assertThat(result.status()).isEqualTo("canceled");
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("interview_session_canceled");
        assertThat(audit.reason()).isEqualTo("개인 사정으로 어렵습니다.");
        assertThat(audit.before()).containsEntry("status", "scheduled");
        assertThat(audit.after()).containsEntry("status", "canceled");
    }

    @Test
    void markNoShowRejectsStaleSessionTransitionBeforeUpdatingApplication() {
        InterviewSessionRecord interviewSession = session("scheduled");

        when(repository.updateScheduledSessionStatus(interviewSession.id(), "no_show")).thenReturn(false);

        assertThatThrownBy(() -> service.markNoShow(
                interviewSession,
                application(UUID.randomUUID(), "selected"),
                post(UUID.randomUUID()),
                UUID.randomUUID(),
                "respondent",
                "founder"
        ))
                .isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "Interview session status has already changed");

        verify(repository, never()).updateApplicationStatusIfCurrent(any(), any(), any());
        verify(repository, never()).saveAttendanceRecord(any());
        verify(repository, never()).findSessionContext(any());
    }

    @Test
    void markNoShowUpdatesApplicationStatusAndAttendance() {
        InterviewSessionRecord interviewSession = session("scheduled");
        ApplicationRecord application = application(UUID.randomUUID(), "selected");
        UUID founderId = UUID.randomUUID();
        InterviewPostRecord post = post(founderId);
        InterviewSessionRecord refreshedSession = new InterviewSessionRecord(
                interviewSession.id(),
                interviewSession.applicationId(),
                interviewSession.scheduledAt(),
                interviewSession.meetingType(),
                interviewSession.meetingUrl(),
                interviewSession.place(),
                "no_show",
                interviewSession.moderationStatus()
        );
        AttendanceRecord attendance = attendance(interviewSession.id(), false, false);

        when(repository.updateScheduledSessionStatus(interviewSession.id(), "no_show")).thenReturn(true);
        when(repository.updateApplicationStatusIfCurrent(application.id(), "no_show", Set.of("selected"))).thenReturn(true);
        when(repository.findAttendanceRecord(interviewSession.id())).thenReturn(Optional.of(attendance));
        when(repository.findSessionContext(interviewSession.id()))
                .thenReturn(Optional.of(new SessionContext(refreshedSession, application, post)));
        when(repository.findChatRoomIdByApplicationId(application.id())).thenReturn(Optional.of(UUID.randomUUID()));

        SessionReadModels.InterviewSessionReadModel result = service.markNoShow(
                interviewSession,
                application,
                post,
                application.respondentId(),
                "respondent",
                "founder"
        );

        assertThat(result.status()).isEqualTo("no_show");
        verify(repository).saveAttendanceRecord(any(AttendanceRecord.class));
        verify(notificationWriteService).createNotification(eq(founderId), eq("no_show_marked"), eq("노쇼 상태가 기록됐어요"), any(), any(), any(), any());
        verify(notificationWriteService).createNotification(eq(application.respondentId()), eq("no_show_marked"), eq("노쇼 상태가 기록됐어요"), any(), any(), any(), any());
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("interview_session_no_show_marked");
        assertThat(audit.before()).containsEntry("status", "scheduled");
        assertThat(audit.after()).containsEntry("status", "no_show");
        assertThat(audit.metadata()).containsEntry("no_show_party", "founder");
    }

    @Test
    void createReviewRejectsDuplicateAndNormalizesTags() {
        UUID actorUserId = UUID.randomUUID();
        InterviewSessionRecord interviewSession = session("completed");
        ApplicationRecord application = application(UUID.randomUUID(), "completed");
        InterviewPostRecord post = post(UUID.randomUUID());

        stubLockedSessionContext(interviewSession, application, post);
        when(repository.findReview(interviewSession.id(), actorUserId))
                .thenReturn(Optional.of(new InterviewReviewRecord(
                        UUID.randomUUID(),
                        interviewSession.id(),
                        actorUserId,
                        UUID.randomUUID(),
                        "respondent",
                        5,
                        List.of(),
                        null,
                        "private",
                        null,
                        null
                )));

        assertThatThrownBy(() -> service.createReview(
                interviewSession,
                application,
                post,
                actorUserId,
                "respondent",
                5,
                List.of(" 시간 준수 ", "", "친절해요"),
                " 좋았어요. "
        )).isInstanceOf(HypofitException.class)
                .extracting("status", "debugMessage")
                .containsExactly(409, "Review already exists");

        when(repository.findReview(interviewSession.id(), actorUserId)).thenReturn(Optional.empty());

        SessionReadModels.InterviewReviewReadModel result = service.createReview(
                interviewSession,
                application,
                post,
                actorUserId,
                "respondent",
                5,
                List.of(" 시간 준수 ", "", "친절해요"),
                " 좋았어요. "
        );

        assertThat(result.tags()).containsExactly("시간 준수", "친절해요");
        assertThat(result.comment()).isEqualTo("좋았어요.");
        verify(notificationWriteService).createNotification(any(), eq("review_received"), eq("후기가 등록됐어요"), any(), any(), any(), any());
        ArgumentCaptor<AuditEventCommand> auditCaptor = ArgumentCaptor.forClass(AuditEventCommand.class);
        verify(auditWriteService).record(auditCaptor.capture());
        AuditEventCommand audit = auditCaptor.getValue();
        assertThat(audit.eventType()).isEqualTo("interview_review_created");
        assertThat(audit.after())
                .containsEntry("session_id", interviewSession.id().toString())
                .containsEntry("reviewer_role", "respondent")
                .containsEntry("rating", 5);
        assertThat(audit.metadata()).containsEntry("application_id", application.id().toString());
    }

    private StoredUser user(UUID userId, String role, OffsetDateTime deletedAt, OffsetDateTime deactivatedAt) {
        return new StoredUser(
                userId,
                "세현",
                null,
                role,
                null,
                deletedAt,
                deactivatedAt
        );
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
        return post(founderId, "interview");
    }

    private InterviewPostRecord post(UUID founderId, String recruitmentType) {
        return new InterviewPostRecord(
                UUID.randomUUID(),
                founderId,
                "인터뷰",
                15000,
                recruitmentType
        );
    }

    private InterviewSessionRecord session(String status) {
        return new InterviewSessionRecord(
                UUID.randomUUID(),
                UUID.randomUUID(),
                OffsetDateTime.parse("2026-08-01T10:00:00Z"),
                "online",
                null,
                null,
                status,
                "visible"
        );
    }

    private AttendanceRecord attendance(UUID sessionId, boolean founderConfirmed, boolean respondentConfirmed) {
        return new AttendanceRecord(
                UUID.randomUUID(),
                sessionId,
                founderConfirmed,
                respondentConfirmed,
                founderConfirmed ? OffsetDateTime.parse("2026-08-01T11:00:00Z") : null,
                respondentConfirmed ? OffsetDateTime.parse("2026-08-01T11:05:00Z") : null,
                null,
                null,
                null,
                null
        );
    }

    private RewardConfirmationRecord reward(
            UUID sessionId,
            UUID applicationId,
            UUID founderId,
            UUID respondentId,
            String status
    ) {
        return new RewardConfirmationRecord(
                UUID.randomUUID(),
                sessionId,
                applicationId,
                founderId,
                respondentId,
                15000,
                status,
                OffsetDateTime.parse("2026-08-01T12:00:00Z"),
                null,
                null,
                null,
                OffsetDateTime.parse("2026-08-01T12:00:00Z"),
                OffsetDateTime.parse("2026-08-01T12:00:00Z")
        );
    }

    private void stubLockedSessionContext(
            InterviewSessionRecord interviewSession,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
        when(repository.lockSessionContext(interviewSession.id()))
                .thenReturn(Optional.of(new SessionContext(interviewSession, application, post)));
    }
}
