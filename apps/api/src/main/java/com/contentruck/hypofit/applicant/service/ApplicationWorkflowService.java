package com.contentruck.hypofit.applicant.service;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.chat.service.ApplicationChatLifecycleService;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApplicationWorkflowService {

    private static final String RECRUITMENT_TYPE_INTERVIEW = "interview";
    private static final String RECRUITMENT_TYPE_SURVEY = "survey";
    private static final String RECRUITMENT_TYPE_BETA_TEST = "beta_test";
    private static final Set<String> WITHDRAWABLE_APPLICATION_STATUSES = Set.of("applied", "selected");
    private static final Set<String> SELECT_ALLOWED_PREVIOUS_STATUSES = Set.of("applied");
    private static final Set<String> REJECT_ALLOWED_PREVIOUS_STATUSES = Set.of("applied");
    private static final Set<String> CANCEL_ALLOWED_PREVIOUS_STATUSES = Set.of("applied", "selected");

    private final ApplicationWorkflowRepository repository;
    private final ApplicationChatLifecycleService chatLifecycleService;
    private final NotificationWriteService notificationWriteService;
    private final AuditWriteService auditWriteService;
    private final AiSummaryEnqueueService aiSummaryEnqueueService;
    private final ApplicationWorkflowMetrics applicationWorkflowMetrics;

    public ApplicationWorkflowService(
            ApplicationWorkflowRepository repository,
            ApplicationChatLifecycleService chatLifecycleService,
            NotificationWriteService notificationWriteService,
            AuditWriteService auditWriteService,
            AiSummaryEnqueueService aiSummaryEnqueueService,
            ApplicationWorkflowMetrics applicationWorkflowMetrics
    ) {
        this.repository = repository;
        this.chatLifecycleService = chatLifecycleService;
        this.notificationWriteService = notificationWriteService;
        this.auditWriteService = auditWriteService;
        this.aiSummaryEnqueueService = aiSummaryEnqueueService;
        this.applicationWorkflowMetrics = applicationWorkflowMetrics;
    }

    @Transactional(readOnly = true)
    public List<ApplicationReadModel> listApplications(UUID userId) {
        requireActiveUser(userId);
        return repository.listVisibleApplicationsForUser(userId);
    }

    @Transactional(readOnly = true)
    public ApplicationReadModel getApplicationDetail(UUID userId, UUID applicationId) {
        requireActiveUser(userId);
        return repository.findVisibleApplicationDetail(applicationId, userId)
                .orElseThrow(() -> new ApplicationNotFoundException("Application not found"));
    }

    @Transactional
    public ApplicationReadModel createApplication(
            UUID userId,
            UUID interviewPostId,
            java.util.Map<String, String> answers,
            java.util.List<String> availableTimes
    ) {
        requireActiveUser(userId);

        InterviewPostOwnership post = repository.findInterviewPost(interviewPostId)
                .orElseThrow(() -> new ApplicationNotFoundException("Interview post not found"));
        ensureApplicationCreationSupported(post);
        if (post.founderId().equals(userId)) {
            throw new ApplicationPermissionDeniedException("Cannot apply to your own interview");
        }
        if (repository.hasActiveBlockBetween(post.founderId(), userId)) {
            throw new ApplicationPermissionDeniedException("Blocked users cannot interact");
        }
        if (repository.existsApplicationForPostAndRespondent(interviewPostId, userId)) {
            throw new ApplicationConflictException("Already applied to this interview");
        }

        try {
            ApplicationReadModel application = repository.createApplication(interviewPostId, userId, answers, availableTimes);
            if (shouldCreateChatRoomOnApply(post.recruitmentType())) {
                chatLifecycleService.ensureRoomForApplication(
                        application.id(),
                        post.id(),
                        post.founderId(),
                        application.respondentId()
                );
            }
            notificationWriteService.createNotification(
                    post.founderId(),
                    "application_created",
                    "새 신청이 도착했어요",
                    "모집글에 새 신청이 들어왔어요.",
                    "application",
                    application.id(),
                    Map.of(
                            "interview_post_id", post.id().toString(),
                            "interview_title", post.title()
                    )
            );
            aiSummaryEnqueueService.enqueueApplicationSummary(application.id());
            return application;
        } catch (DataIntegrityViolationException exception) {
            throw new ApplicationConflictException("Already applied to this interview");
        }
    }

    @Transactional
    public ApplicationReadModel withdrawApplication(UUID userId, UUID applicationId) {
        requireActiveUser(userId);

        ApplicationWorkflowContext context = repository.lockVisibleApplicationContext(applicationId)
                .orElseThrow(() -> new ApplicationNotFoundException("Application not found"));
        ensureApplicationWorkflowSupported(context.recruitmentType());
        if (!context.respondentId().equals(userId)) {
            throw new ApplicationPermissionDeniedException("Forbidden");
        }
        if (!WITHDRAWABLE_APPLICATION_STATUSES.contains(context.status())) {
            throw new ApplicationConflictException("Only applied or selected applications can be withdrawn");
        }
        if ("selected".equals(context.status()) && repository.hasScheduledVisibleSession(applicationId)) {
            throw new ApplicationConflictException("Cannot withdraw after the interview is scheduled");
        }

        ApplicationReadModel application = repository.updateStatusIfCurrent(
                        applicationId,
                        "canceled",
                        WITHDRAWABLE_APPLICATION_STATUSES,
                        null
                )
                .orElseThrow(() -> new ApplicationConflictException("Application status has already changed"));
        if (shouldManageExistingChatRoom(context.recruitmentType(), context.status())) {
            chatLifecycleService.markCanceledForApplication(
                    application.id(),
                    context.interviewPostId(),
                    context.founderId(),
                    application.respondentId()
            );
        }
        notificationWriteService.createNotification(
                context.founderId(),
                "application_withdrawn",
                "신청이 철회됐어요",
                "selected".equals(context.status())
                        ? "선정된 신청자가 인터뷰 참여를 철회했어요."
                        : "지원자가 인터뷰 신청을 철회했어요.",
                "application",
                application.id(),
                Map.of(
                        "interview_post_id", context.interviewPostId().toString(),
                        "previous_status", context.status()
                )
        );
        auditWriteService.record(new AuditEventCommand(
                userId,
                "user",
                "application_withdrawn",
                "application",
                application.id(),
                Map.of("status", context.status()),
                Map.of("status", application.status()),
                null,
                Map.of(
                        "interview_post_id", context.interviewPostId().toString(),
                        "founder_id", context.founderId().toString(),
                        "respondent_id", application.respondentId().toString()
                )
        ));
        return application;
    }

    @Transactional
    public ApplicationReadModel updateApplicationStatus(
            UUID userId,
            UUID applicationId,
            String nextStatus,
            String rejectionReason
    ) {
        requireActiveUser(userId);

        ApplicationWorkflowContext context = loadApplicationContextForStatusChange(applicationId, nextStatus)
                .orElseThrow(() -> new ApplicationNotFoundException("Application not found"));
        ensureApplicationWorkflowSupported(context.recruitmentType());
        if (!context.founderId().equals(userId)) {
            throw new ApplicationPermissionDeniedException("Forbidden");
        }

        Set<String> allowedStatuses = switch (nextStatus) {
            case "selected" -> SELECT_ALLOWED_PREVIOUS_STATUSES;
            case "rejected" -> REJECT_ALLOWED_PREVIOUS_STATUSES;
            case "canceled" -> CANCEL_ALLOWED_PREVIOUS_STATUSES;
            default -> throw new ApplicationConflictException(
                    "Application status can only be selected, rejected, or canceled here"
            );
        };
        String normalizedReason = rejectionReason == null ? null : rejectionReason.trim();
        if (normalizedReason != null && normalizedReason.isBlank()) {
            normalizedReason = null;
        }
        if ("selected".equals(nextStatus)) {
            if (!allowedStatuses.contains(context.status())) {
                throw new ApplicationConflictException("Application status has already changed");
            }
            ensureSelectionCapacityAvailable(context);
        }

        ApplicationReadModel application = repository.updateStatusIfCurrent(
                        applicationId,
                        nextStatus,
                        allowedStatuses,
                        normalizedReason
                )
                .orElseThrow(() -> new ApplicationConflictException("Application status has already changed"));
        if ("selected".equals(nextStatus)) {
            applicationWorkflowMetrics.recordSelection("selected");
            if (shouldManageSelectedChatRoom(context.recruitmentType())) {
                chatLifecycleService.markSelectedForApplication(
                        application.id(),
                        context.interviewPostId(),
                        context.founderId(),
                        application.respondentId()
                );
            }
            notificationWriteService.createNotification(
                    context.respondentId(),
                    "application_selected",
                    selectedNotificationTitle(context.recruitmentType()),
                    selectedNotificationBody(context.recruitmentType()),
                    "application",
                    application.id(),
                    Map.of(
                            "interview_post_id", context.interviewPostId().toString(),
                            "interview_title", context.interviewTitle()
                    )
            );
        } else if ("rejected".equals(nextStatus)) {
            if (shouldManageExistingChatRoom(context.recruitmentType(), context.status())) {
                chatLifecycleService.markRejectedForApplication(
                        application.id(),
                        context.interviewPostId(),
                        context.founderId(),
                        application.respondentId(),
                        normalizedReason != null ? normalizedReason : "사유가 입력되지 않았어요."
                );
            }
            notificationWriteService.createNotification(
                    context.respondentId(),
                    "application_rejected",
                    "신청이 반려됐어요",
                    normalizedReason != null ? normalizedReason : "이번 인터뷰 신청은 반려됐어요.",
                    "application",
                    application.id(),
                    Map.of(
                            "interview_post_id", context.interviewPostId().toString(),
                            "interview_title", context.interviewTitle()
                    )
            );
        } else if ("canceled".equals(nextStatus)) {
            if (shouldManageExistingChatRoom(context.recruitmentType(), context.status())) {
                chatLifecycleService.markCanceledForApplication(
                        application.id(),
                        context.interviewPostId(),
                        context.founderId(),
                        application.respondentId()
                );
            }
            notificationWriteService.createNotification(
                    context.respondentId(),
                    "application_canceled",
                    "인터뷰 신청이 취소됐어요",
                    "인터뷰 신청 상태가 취소로 변경됐어요.",
                    "application",
                    application.id(),
                    Map.of("interview_post_id", context.interviewPostId().toString())
            );
        }
        return application;
    }

    private Optional<ApplicationWorkflowContext> loadApplicationContextForStatusChange(UUID applicationId, String nextStatus) {
        if ("selected".equals(nextStatus)) {
            return repository.lockVisibleApplicationContext(applicationId);
        }
        return repository.findVisibleApplicationContext(applicationId);
    }

    private void ensureSelectionCapacityAvailable(ApplicationWorkflowContext context) {
        if ("unlimited".equals(context.recruitmentLimitMode()) || context.recruitCount() <= 0) {
            return;
        }
        if (repository.countSelectedVisibleApplications(context.interviewPostId()) >= context.recruitCount()) {
            applicationWorkflowMetrics.recordSelection("capacity_reached");
            throw new ApplicationSelectionCapacityReachedException();
        }
    }

    private void ensureApplicationWorkflowSupported(String recruitmentType) {
        if (RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType)
                || RECRUITMENT_TYPE_SURVEY.equals(recruitmentType)
                || RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType)) {
            return;
        }
        throw new ApplicationRecruitmentTypeActionNotAllowedException(
                "Unsupported recruitment type for the application workflow: " + recruitmentType
        );
    }

    private void ensureApplicationCreationSupported(InterviewPostOwnership post) {
        ensureApplicationWorkflowSupported(post.recruitmentType());
        if (RECRUITMENT_TYPE_SURVEY.equals(post.recruitmentType()) && "direct".equals(post.entryMode())) {
            throw new ApplicationRecruitmentTypeActionNotAllowedException(
                    "Direct survey posts do not use the application workflow"
            );
        }
    }

    private boolean shouldCreateChatRoomOnApply(String recruitmentType) {
        return RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType);
    }

    private boolean shouldManageExistingChatRoom(String recruitmentType, String currentStatus) {
        if (RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType)) {
            return true;
        }
        return RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType) && "selected".equals(currentStatus);
    }

    private boolean shouldManageSelectedChatRoom(String recruitmentType) {
        return RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType)
                || RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType);
    }

    private String selectedNotificationTitle(String recruitmentType) {
        return RECRUITMENT_TYPE_SURVEY.equals(recruitmentType)
                ? "설문 참여가 승인됐어요"
                : "인터뷰 대상자로 선정됐어요";
    }

    private String selectedNotificationBody(String recruitmentType) {
        return RECRUITMENT_TYPE_SURVEY.equals(recruitmentType)
                ? "공고에서 설문을 시작할 수 있어요."
                : "채팅에서 일정과 진행 방식을 조율해보세요.";
    }

    private ApplicationUserAccount requireActiveUser(UUID userId) {
        ApplicationUserAccount account = repository.findUserAccount(userId)
                .orElseThrow(UserProfileMissingException::new);
        if (account.deleted()) {
            throw new UserAccountDeletedException();
        }
        if (account.deactivated()) {
            throw new UserAccountDeactivatedException();
        }
        return account;
    }
}
