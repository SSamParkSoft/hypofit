package com.contentruck.hypofit.applicant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.chat.service.ApplicationChatLifecycleService;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

@ExtendWith(MockitoExtension.class)
class ApplicationWorkflowServiceTest {

    @Mock
    private ApplicationWorkflowRepository repository;

    @Mock
    private ApplicationChatLifecycleService chatLifecycleService;

    @Mock
    private NotificationWriteService notificationWriteService;

    @Mock
    private AuditWriteService auditWriteService;

    @Mock
    private AiSummaryEnqueueService aiSummaryEnqueueService;

    @Test
    void listApplicationsRequiresActiveProfile() {
        UUID userId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.empty());

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.listApplications(userId))
                .isInstanceOf(UserProfileMissingException.class);
        verify(repository, never()).listVisibleApplicationsForUser(any());
    }

    @Test
    void getApplicationDetailReturnsVisibleApplicationForRespondentOrFounder() {
        UUID viewerId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        ApplicationReadModel application = readModel(applicationId, UUID.randomUUID(), viewerId, "applied", null);
        when(repository.findUserAccount(viewerId)).thenReturn(Optional.of(account(viewerId, "respondent")));
        when(repository.findVisibleApplicationDetail(applicationId, viewerId)).thenReturn(Optional.of(application));

        ApplicationWorkflowService service = service();
        ApplicationReadModel result = service.getApplicationDetail(viewerId, applicationId);

        assertThat(result).isEqualTo(application);
    }

    @Test
    void getApplicationDetailHidesUnauthorizedOrMissingRowsAsNotFound() {
        UUID viewerId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(viewerId)).thenReturn(Optional.of(account(viewerId, "respondent")));
        when(repository.findVisibleApplicationDetail(applicationId, viewerId)).thenReturn(Optional.empty());

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.getApplicationDetail(viewerId, applicationId))
                .isInstanceOf(ApplicationNotFoundException.class)
                .hasMessageContaining("Application not found");
    }

    @Test
    void createApplicationAllowsFounderParticipantRole() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "founder")));
        UUID founderId = UUID.randomUUID();
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "interview")));
        when(repository.hasActiveBlockBetween(any(), any())).thenReturn(false);
        when(repository.existsApplicationForPostAndRespondent(postId, userId)).thenReturn(false);
        when(repository.createApplication(eq(postId), eq(userId), any(), any()))
                .thenReturn(readModel(UUID.randomUUID(), postId, userId, "applied", null));

        ApplicationWorkflowService service = service();
        ApplicationReadModel result = service.createApplication(userId, postId, Map.of("experience", "yes"), List.of("평일 저녁"));

        assertThat(result.respondentId()).isEqualTo(userId);
        assertThat(result.status()).isEqualTo("applied");
        verify(chatLifecycleService).ensureRoomForApplication(result.id(), postId, founderId, userId);
        verify(notificationWriteService).createNotification(
                eq(founderId),
                eq("application_created"),
                eq("새 신청이 도착했어요"),
                eq("모집글에 새 인터뷰 신청이 들어왔어요."),
                eq("application"),
                eq(result.id()),
                any()
        );
        verify(aiSummaryEnqueueService).enqueueApplicationSummary(result.id());
    }

    @Test
    void createApplicationRejectsDuplicateBeforeWrite() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "interview")));
        when(repository.hasActiveBlockBetween(founderId, userId)).thenReturn(false);
        when(repository.existsApplicationForPostAndRespondent(postId, userId)).thenReturn(true);

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.createApplication(userId, postId, Map.of(), List.of()))
                .isInstanceOf(ApplicationConflictException.class)
                .hasMessageContaining("Already applied to this interview");
        verify(repository, never()).createApplication(any(), any(), any(), any());
        verify(aiSummaryEnqueueService, never()).enqueueApplicationSummary(any());
    }

    @Test
    void createApplicationTranslatesDatabaseDuplicateConflict() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "interview")));
        when(repository.hasActiveBlockBetween(founderId, userId)).thenReturn(false);
        when(repository.existsApplicationForPostAndRespondent(postId, userId)).thenReturn(false);
        when(repository.createApplication(eq(postId), eq(userId), any(), any()))
                .thenThrow(new DataIntegrityViolationException("uq_applications_post_respondent"));

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.createApplication(userId, postId, Map.of(), List.of()))
                .isInstanceOf(ApplicationConflictException.class)
                .hasMessageContaining("Already applied to this interview");
    }

    @Test
    void createApplicationRejectsSelfApplication() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "both")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, userId, "interview")));

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.createApplication(userId, postId, Map.of(), List.of()))
                .isInstanceOf(ApplicationPermissionDeniedException.class)
                .hasMessageContaining("Cannot apply to your own interview");
    }

    @Test
    void createApplicationRejectsBlockedInteraction() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "interview")));
        when(repository.hasActiveBlockBetween(founderId, userId)).thenReturn(true);

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.createApplication(userId, postId, Map.of(), List.of()))
                .isInstanceOf(ApplicationPermissionDeniedException.class)
                .hasMessageContaining("Blocked users cannot interact");
    }

    @Test
    void createApplicationRejectsSurveyRecruitmentType() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "survey")));

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.createApplication(userId, postId, Map.of(), List.of()))
                .isInstanceOf(ApplicationRecruitmentTypeActionNotAllowedException.class)
                .extracting("code")
                .isEqualTo("recruitment_type_action_not_allowed");
        verify(repository, never()).createApplication(any(), any(), any(), any());
        verify(chatLifecycleService, never()).ensureRoomForApplication(any(), any(), any(), any());
    }

    @Test
    void createApplicationForBetaTestDoesNotCreateChatRoomUntilSelection() {
        UUID userId = UUID.randomUUID();
        UUID postId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        ApplicationReadModel created = readModel(UUID.randomUUID(), postId, userId, "applied", null);

        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.findInterviewPost(postId)).thenReturn(Optional.of(post(postId, founderId, "beta_test")));
        when(repository.hasActiveBlockBetween(founderId, userId)).thenReturn(false);
        when(repository.existsApplicationForPostAndRespondent(postId, userId)).thenReturn(false);
        when(repository.createApplication(eq(postId), eq(userId), any(), any())).thenReturn(created);

        ApplicationWorkflowService service = service();
        ApplicationReadModel result = service.createApplication(userId, postId, Map.of("experience", "yes"), List.of("주말"));

        assertThat(result).isEqualTo(created);
        verify(chatLifecycleService, never()).ensureRoomForApplication(any(), any(), any(), any());
        verify(notificationWriteService).createNotification(
                eq(founderId),
                eq("application_created"),
                eq("새 신청이 도착했어요"),
                eq("모집글에 새 인터뷰 신청이 들어왔어요."),
                eq("application"),
                eq(created.id()),
                any()
        );
    }

    @Test
    void withdrawApplicationRejectsScheduledSelectedApplication() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.lockVisibleApplicationContext(applicationId)).thenReturn(Optional.of(context(applicationId, userId, "selected")));
        when(repository.hasScheduledVisibleSession(applicationId)).thenReturn(true);

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.withdrawApplication(userId, applicationId))
                .isInstanceOf(ApplicationConflictException.class)
                .hasMessageContaining("Cannot withdraw after the interview is scheduled");
    }

    @Test
    void withdrawApplicationRejectsStaleStatusTransition() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.lockVisibleApplicationContext(applicationId)).thenReturn(Optional.of(context(applicationId, userId, "selected")));
        when(repository.updateStatusIfCurrent(applicationId, "canceled", Set.of("applied", "selected"), null))
                .thenReturn(Optional.empty());

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.withdrawApplication(userId, applicationId))
                .isInstanceOf(ApplicationConflictException.class)
                .hasMessageContaining("Application status has already changed");
        verify(chatLifecycleService, never()).markCanceledForApplication(any(), any(), any(), any());
        verify(notificationWriteService, never()).createNotification(any(), any(), any(), any(), any(), any(), any());
        verify(auditWriteService, never()).record(any());
    }

    @Test
    void withdrawApplicationRecordsAuditAndCancelsChatRoom() {
        UUID userId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        ApplicationWorkflowContext context = new ApplicationWorkflowContext(
                applicationId,
                interviewPostId,
                "인터뷰 제목",
                "interview",
                founderId,
                userId,
                Map.of("experience", "yes"),
                List.of("평일 저녁"),
                "selected",
                null
        );
        ApplicationReadModel updated = readModel(applicationId, interviewPostId, userId, "canceled", null);

        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.lockVisibleApplicationContext(applicationId)).thenReturn(Optional.of(context));
        when(repository.updateStatusIfCurrent(applicationId, "canceled", Set.of("applied", "selected"), null))
                .thenReturn(Optional.of(updated));

        ApplicationWorkflowService service = service();

        ApplicationReadModel result = service.withdrawApplication(userId, applicationId);

        assertThat(result.status()).isEqualTo("canceled");
        InOrder inOrder = inOrder(chatLifecycleService, notificationWriteService, auditWriteService);
        inOrder.verify(chatLifecycleService).markCanceledForApplication(applicationId, interviewPostId, founderId, userId);
        inOrder.verify(notificationWriteService).createNotification(
                eq(founderId),
                eq("application_withdrawn"),
                eq("신청이 철회됐어요"),
                eq("선정된 신청자가 인터뷰 참여를 철회했어요."),
                eq("application"),
                eq(applicationId),
                eq(Map.of(
                        "interview_post_id", interviewPostId.toString(),
                        "previous_status", "selected"
                ))
        );
        inOrder.verify(auditWriteService).record(new AuditEventCommand(
                userId,
                "user",
                "application_withdrawn",
                "application",
                applicationId,
                Map.of("status", "selected"),
                Map.of("status", "canceled"),
                null,
                Map.of(
                        "interview_post_id", interviewPostId.toString(),
                        "founder_id", founderId.toString(),
                        "respondent_id", userId.toString()
                )
        ));
    }

    @Test
    void updateApplicationStatusRequiresFounderOwnership() {
        UUID founderId = UUID.randomUUID();
        UUID otherFounderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(founderId)).thenReturn(Optional.of(account(founderId, "founder")));
        when(repository.findVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(new ApplicationWorkflowContext(
                        applicationId,
                        UUID.randomUUID(),
                        "인터뷰 제목",
                        "interview",
                        otherFounderId,
                        UUID.randomUUID(),
                        Map.of(),
                        List.of(),
                        "applied",
                        null
                )));

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.updateApplicationStatus(founderId, applicationId, "selected", null))
                .isInstanceOf(ApplicationPermissionDeniedException.class)
                .hasMessageContaining("Forbidden");
    }

    @Test
    void updateApplicationStatusAllowsRespondentRoleWhenUserOwnsPost() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        when(repository.findUserAccount(founderId)).thenReturn(Optional.of(account(founderId, "respondent")));
        when(repository.findVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(context(applicationId, respondentId, "applied", founderId, interviewPostId)));
        when(repository.updateStatusIfCurrent(applicationId, "selected", Set.of("applied"), null))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, respondentId, "selected", null)));

        ApplicationWorkflowService service = service();
        ApplicationReadModel result = service.updateApplicationStatus(founderId, applicationId, "selected", null);

        assertThat(result.status()).isEqualTo("selected");
        verify(chatLifecycleService).markSelectedForApplication(
                applicationId,
                interviewPostId,
                founderId,
                respondentId
        );
        verify(notificationWriteService).createNotification(
                eq(respondentId),
                eq("application_selected"),
                eq("인터뷰 대상자로 선정됐어요"),
                eq("채팅에서 일정과 진행 방식을 조율해보세요."),
                eq("application"),
                eq(applicationId),
                any()
        );
    }

    @Test
    void updateApplicationStatusRejectsDeletedAccount() {
        UUID userId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(new ApplicationUserAccount(
                userId,
                "user@example.com",
                "founder",
                true,
                false
        )));

        ApplicationWorkflowService service = service();

        assertThatThrownBy(() -> service.updateApplicationStatus(userId, applicationId, "selected", null))
                .isInstanceOf(UserAccountDeletedException.class);
    }

    @Test
    void updateApplicationStatusUsesAllowedPreviousStatuses() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(founderId)).thenReturn(Optional.of(account(founderId, "both")));
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        when(repository.findVisibleApplicationContext(applicationId)).thenReturn(Optional.of(context(applicationId, respondentId, "applied", founderId, interviewPostId)));
        when(repository.updateStatusIfCurrent(applicationId, "rejected", Set.of("applied"), "일정이 맞지 않아요"))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, respondentId, "rejected", "일정이 맞지 않아요")));

        ApplicationWorkflowService service = service();
        ApplicationReadModel result = service.updateApplicationStatus(
                founderId,
                applicationId,
                "rejected",
                "일정이 맞지 않아요"
        );

        assertThat(result.status()).isEqualTo("rejected");
        assertThat(result.rejectionReason()).isEqualTo("일정이 맞지 않아요");
        verify(chatLifecycleService).markRejectedForApplication(
                applicationId,
                interviewPostId,
                founderId,
                respondentId,
                "일정이 맞지 않아요"
        );
        verify(notificationWriteService).createNotification(
                eq(respondentId),
                eq("application_rejected"),
                eq("신청이 반려됐어요"),
                eq("일정이 맞지 않아요"),
                eq("application"),
                eq(result.id()),
                any()
        );
    }

    @Test
    void updateApplicationStatusForBetaSelectionCreatesChatRoom() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        when(repository.findUserAccount(founderId)).thenReturn(Optional.of(account(founderId, "both")));
        when(repository.findVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(context(applicationId, respondentId, "applied", founderId, interviewPostId, "beta_test")));
        when(repository.updateStatusIfCurrent(applicationId, "selected", Set.of("applied"), null))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, respondentId, "selected", null)));

        ApplicationWorkflowService service = service();
        service.updateApplicationStatus(founderId, applicationId, "selected", null);

        verify(chatLifecycleService).markSelectedForApplication(applicationId, interviewPostId, founderId, respondentId);
    }

    @Test
    void updateApplicationStatusForBetaRejectionDoesNotTouchChatRoom() {
        UUID founderId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        when(repository.findUserAccount(founderId)).thenReturn(Optional.of(account(founderId, "both")));
        when(repository.findVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(context(applicationId, respondentId, "applied", founderId, interviewPostId, "beta_test")));
        when(repository.updateStatusIfCurrent(applicationId, "rejected", Set.of("applied"), "조건이 맞지 않아요"))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, respondentId, "rejected", "조건이 맞지 않아요")));

        ApplicationWorkflowService service = service();
        service.updateApplicationStatus(founderId, applicationId, "rejected", "조건이 맞지 않아요");

        verify(chatLifecycleService, never()).markRejectedForApplication(any(), any(), any(), any(), any());
    }

    @Test
    void withdrawApplicationForAppliedBetaDoesNotTouchChatRoom() {
        UUID userId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.lockVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(context(applicationId, userId, "applied", founderId, interviewPostId, "beta_test")));
        when(repository.updateStatusIfCurrent(applicationId, "canceled", Set.of("applied", "selected"), null))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, userId, "canceled", null)));

        ApplicationWorkflowService service = service();
        service.withdrawApplication(userId, applicationId);

        verify(chatLifecycleService, never()).markCanceledForApplication(any(), any(), any(), any());
    }

    @Test
    void withdrawApplicationForSelectedBetaCancelsExistingChatRoom() {
        UUID userId = UUID.randomUUID();
        UUID founderId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        when(repository.findUserAccount(userId)).thenReturn(Optional.of(account(userId, "respondent")));
        when(repository.lockVisibleApplicationContext(applicationId))
                .thenReturn(Optional.of(context(applicationId, userId, "selected", founderId, interviewPostId, "beta_test")));
        when(repository.hasScheduledVisibleSession(applicationId)).thenReturn(false);
        when(repository.updateStatusIfCurrent(applicationId, "canceled", Set.of("applied", "selected"), null))
                .thenReturn(Optional.of(readModel(applicationId, interviewPostId, userId, "canceled", null)));

        ApplicationWorkflowService service = service();
        service.withdrawApplication(userId, applicationId);

        verify(chatLifecycleService).markCanceledForApplication(applicationId, interviewPostId, founderId, userId);
    }

    private ApplicationWorkflowService service() {
        return new ApplicationWorkflowService(
                repository,
                chatLifecycleService,
                notificationWriteService,
                auditWriteService,
                aiSummaryEnqueueService
        );
    }

    private ApplicationUserAccount account(UUID userId, String role) {
        return new ApplicationUserAccount(userId, "user@example.com", role, false, false);
    }

    private ApplicationWorkflowContext context(UUID applicationId, UUID respondentId, String status) {
        return context(applicationId, respondentId, status, UUID.randomUUID());
    }

    private ApplicationWorkflowContext context(UUID applicationId, UUID respondentId, String status, UUID founderId) {
        return context(applicationId, respondentId, status, founderId, UUID.randomUUID());
    }

    private ApplicationWorkflowContext context(
            UUID applicationId,
            UUID respondentId,
            String status,
            UUID founderId,
            UUID interviewPostId
    ) {
        return context(applicationId, respondentId, status, founderId, interviewPostId, "interview");
    }

    private ApplicationWorkflowContext context(
            UUID applicationId,
            UUID respondentId,
            String status,
            UUID founderId,
            UUID interviewPostId,
            String recruitmentType
    ) {
        return new ApplicationWorkflowContext(
                applicationId,
                interviewPostId,
                "인터뷰 제목",
                recruitmentType,
                founderId,
                respondentId,
                Map.of("experience", "yes"),
                List.of("평일 저녁"),
                status,
                null
        );
    }

    private ApplicationReadModel readModel(UUID applicationId, UUID postId, UUID respondentId, String status, String rejectionReason) {
        return new ApplicationReadModel(
                applicationId,
                postId,
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
                )
        );
    }

    private InterviewPostOwnership post(UUID postId, UUID founderId, String recruitmentType) {
        return new InterviewPostOwnership(postId, founderId, "인터뷰 제목", recruitmentType);
    }
}
