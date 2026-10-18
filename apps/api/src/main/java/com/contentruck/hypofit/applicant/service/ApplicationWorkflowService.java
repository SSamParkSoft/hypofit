package com.contentruck.hypofit.applicant.service;

import com.contentruck.hypofit.ai.service.AiSummaryEnqueueService;
import com.contentruck.hypofit.applicant.repository.ApplicationSharingConsentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import com.contentruck.hypofit.audit.service.AuditEventCommand;
import com.contentruck.hypofit.audit.service.AuditWriteService;
import com.contentruck.hypofit.chat.service.ApplicationChatLifecycleService;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.user.service.UserAccountDeactivatedException;
import com.contentruck.hypofit.user.service.UserAccountDeletedException;
import com.contentruck.hypofit.user.service.UserProfileMissingException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private static final String RECRUITMENT_TYPE_RESEARCH = "research_experiment";
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
    private final ApplicationSharingConsentRepository sharingConsentRepository;
    private final boolean sharingConsentRequired;

    public ApplicationWorkflowService(
            ApplicationWorkflowRepository repository,
            ApplicationChatLifecycleService chatLifecycleService,
            NotificationWriteService notificationWriteService,
            AuditWriteService auditWriteService,
            AiSummaryEnqueueService aiSummaryEnqueueService,
            ApplicationWorkflowMetrics applicationWorkflowMetrics,
            ApplicationSharingConsentRepository sharingConsentRepository,
            @Value("${hypofit.privacy.application-sharing-consent-required:false}") boolean sharingConsentRequired
    ) {
        this.repository = repository;
        this.chatLifecycleService = chatLifecycleService;
        this.notificationWriteService = notificationWriteService;
        this.auditWriteService = auditWriteService;
        this.aiSummaryEnqueueService = aiSummaryEnqueueService;
        this.applicationWorkflowMetrics = applicationWorkflowMetrics;
        this.sharingConsentRepository = sharingConsentRepository;
        this.sharingConsentRequired = sharingConsentRequired;
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
        return createApplication(userId, interviewPostId, answers, availableTimes, null);
    }

    @Transactional
    public ApplicationReadModel createApplication(
            UUID userId,
            UUID interviewPostId,
            Map<String, String> answers,
            List<String> availableTimes,
            JsonNode sharingConsent
    ) {
        requireActiveUser(userId);

        InterviewPostOwnership post = repository.findInterviewPost(interviewPostId)
                .orElseThrow(() -> new ApplicationNotFoundException("Interview post not found"));
        ApplicationSharingConsent.validate(sharingConsent, post.founderId(), sharingConsentRequired);
        ensureApplicationCreationSupported(post);
        if (!"open".equals(post.status())) {
            throw new ApplicationConflictException("Only open postings accept new applications");
        }
        if (post.founderId().equals(userId)) {
            throw new ApplicationPermissionDeniedException("Cannot apply to your own interview");
        }
        if (repository.hasActiveBlockBetween(post.founderId(), userId)) {
            throw new ApplicationPermissionDeniedException("Blocked users cannot interact");
        }
        if (repository.existsApplicationForPostAndRespondent(interviewPostId, userId)) {
            throw new ApplicationConflictException("Already applied to this interview");
        }

        ApplicationReadModel application;
        try {
            application = repository.createApplication(interviewPostId, userId, answers, availableTimes);
        } catch (DataIntegrityViolationException exception) {
            throw new ApplicationConflictException("Already applied to this interview");
        }
        if (sharingConsent != null) {
            sharingConsentRepository.record(application.id(), userId, post.founderId(), sharingConsent.get("source").textValue());
        }
        notificationWriteService.createNotification(
                post.founderId(),
                "application_created",
                "새 신청이 도착했어요",
                "지원 내용을 확인할 수 있어요.",
                "application",
                application.id(),
                Map.of(
                        "interview_post_id", post.id().toString(),
                        "interview_title", post.title()
                )
        );
        aiSummaryEnqueueService.enqueueApplicationSummary(application.id());
        return application;
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
                "지원자가 신청을 철회했어요",
                "selected".equals(context.status())
                        ? "선정된 신청자가 참여를 철회했어요."
                        : "지원자가 신청을 철회했어요.",
                "application",
                application.id(),
                Map.of(
                        "interview_post_id", context.interviewPostId().toString(),
                        "interview_title", context.interviewTitle(),
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

        ApplicationWorkflowContext context = repository.lockVisibleApplicationContext(applicationId)
                .orElseThrow(() -> new ApplicationNotFoundException("Application not found"));
        ensureApplicationWorkflowSupported(context.recruitmentType());
        if (!context.founderId().equals(userId)) {
            throw new ApplicationPermissionDeniedException("Forbidden");
        }
        if (sharingConsentRepository.isWithdrawn(applicationId)) {
            throw new ApplicationNotFoundException("Application not found");
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
            UUID roomId = null;
            if (shouldManageSelectedChatRoom(context.recruitmentType())) {
                roomId = chatLifecycleService.markSelectedForApplication(
                        application.id(),
                        context.interviewPostId(),
                        context.founderId(),
                        application.respondentId()
                );
            }
            Map<String, Object> metadata = new HashMap<>(Map.of(
                    "interview_post_id", context.interviewPostId().toString(),
                    "interview_title", context.interviewTitle()
            ));
            if (roomId != null) {
                metadata.put("chat_room_id", roomId.toString());
            }
            notificationWriteService.createNotification(
                    context.respondentId(),
                    "application_selected",
                    selectedNotificationTitle(context.recruitmentType()),
                    selectedNotificationBody(context.recruitmentType()),
                    "application",
                    application.id(),
                    metadata
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
                    "이번 모집에 선정되지 않았어요",
                    normalizedReason != null ? normalizedReason : "신청 결과를 확인할 수 있어요.",
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
                    "참여 신청이 취소됐어요",
                    "공고에서 변경된 참여 상태를 확인할 수 있어요.",
                    "application",
                    application.id(),
                    Map.of(
                            "interview_post_id", context.interviewPostId().toString(),
                            "interview_title", context.interviewTitle()
                    )
            );
        }
        return application;
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
                || RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType)
                || RECRUITMENT_TYPE_RESEARCH.equals(recruitmentType)) {
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

    private boolean shouldManageExistingChatRoom(String recruitmentType, String currentStatus) {
        if (RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType)) {
            return true;
        }
        return (RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType) || RECRUITMENT_TYPE_RESEARCH.equals(recruitmentType))
                && "selected".equals(currentStatus);
    }

    private boolean shouldManageSelectedChatRoom(String recruitmentType) {
        return RECRUITMENT_TYPE_INTERVIEW.equals(recruitmentType)
                || RECRUITMENT_TYPE_BETA_TEST.equals(recruitmentType)
                || RECRUITMENT_TYPE_RESEARCH.equals(recruitmentType);
    }

    private String selectedNotificationTitle(String recruitmentType) {
        return switch (recruitmentType) {
            case RECRUITMENT_TYPE_SURVEY -> "설문 참여가 승인됐어요";
            case RECRUITMENT_TYPE_BETA_TEST -> "베타테스트 참여자로 선정됐어요";
            case RECRUITMENT_TYPE_RESEARCH -> "연구 실험 참여자로 선정됐어요";
            default -> "인터뷰에 선정됐어요";
        };
    }

    private String selectedNotificationBody(String recruitmentType) {
        return switch (recruitmentType) {
            case RECRUITMENT_TYPE_SURVEY -> "공고에서 설문을 시작할 수 있어요.";
            case RECRUITMENT_TYPE_BETA_TEST -> "채팅에서 테스트 준비와 진행 방법을 확인해 주세요.";
            case RECRUITMENT_TYPE_RESEARCH -> "채팅에서 연구 일정과 준비 사항을 확인해 주세요.";
            default -> "채팅에서 일정과 진행 방식을 조율할 수 있어요.";
        };
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
