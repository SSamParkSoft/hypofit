package com.contentruck.hypofit.admin.application;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.notification.application.NotificationWriteService;
import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import com.contentruck.hypofit.push.application.PushDispatchService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminOperationsService {

    private final AdminOperationsRepository repository;
    private final NotificationWriteService notificationWriteService;
    private final PushDispatchService pushDispatchService;

    public AdminOperationsService(
            AdminOperationsRepository repository,
            NotificationWriteService notificationWriteService,
            PushDispatchService pushDispatchService
    ) {
        this.repository = repository;
        this.notificationWriteService = notificationWriteService;
        this.pushDispatchService = pushDispatchService;
    }

    @Transactional(readOnly = true)
    public AdminSummaryView getSummary() {
        int open = 0;
        int inReview = 0;
        int reportsOpen = 0;

        for (AdminOperationsRepository.SupportStatusCount row : repository.summarizeSupportStatuses()) {
            int count = Math.toIntExact(row.count());
            if ("open".equals(row.status())) {
                open += count;
            }
            if ("in_review".equals(row.status())) {
                inReview += count;
            }
            if ("report".equals(row.kind()) && ("open".equals(row.status()) || "in_review".equals(row.status()))) {
                reportsOpen += count;
            }
        }

        return new AdminSummaryView(
                new AdminSupportSummaryView(
                        open,
                        inReview,
                        reportsOpen,
                        Math.toIntExact(repository.countOpenAccountDeletionRequests())
                ),
                new AdminHealthSummaryView(
                        "ok",
                        repository.isDatabaseAvailable() ? "ok" : "unavailable",
                        "check_ready_endpoint",
                        "check_ready_endpoint"
                )
        );
    }

    @Transactional(readOnly = true)
    public AdminTargetPreviewView getTargetPreview(String targetType, UUID targetId) {
        return switch (targetType) {
            case "user" -> repository.findUserPreview(targetId)
                    .map(this::toUserPreview)
                    .orElseGet(() -> missing(targetType, targetId));
            case "interview_post" -> repository.findInterviewPostPreview(targetId)
                    .map(this::toInterviewPostPreview)
                    .orElseGet(() -> missing(targetType, targetId));
            case "application" -> repository.findApplicationPreview(targetId)
                    .map(this::toApplicationPreview)
                    .orElseGet(() -> missing(targetType, targetId));
            case "chat_room" -> repository.findChatRoomPreview(targetId)
                    .map(this::toChatRoomPreview)
                    .orElseGet(() -> missing(targetType, targetId));
            case "chat_message" -> repository.findChatMessagePreview(targetId)
                    .map(this::toChatMessagePreview)
                    .orElseGet(() -> missing(targetType, targetId));
            case "session" -> repository.findSessionPreview(targetId)
                    .map(this::toSessionPreview)
                    .orElseGet(() -> missing(targetType, targetId));
            default -> throw new HypofitException(
                    "validation_failed",
                    "입력값을 확인해 주세요.",
                    HttpStatus.UNPROCESSABLE_ENTITY.value(),
                    "Unsupported target type"
            );
        };
    }

    public AdminTestNotificationView createTestNotification(AdminTestNotificationCommand command) {
        AdminOperationsRepository.UserPreviewRecord user = repository.findUserByEmail(command.email())
                .orElseThrow(AdminUserNotFoundException::new);

        String[] copy = testNotificationCopy(command.type());
        NotificationReadModel notification = notificationWriteService.createNotification(
                user.id(),
                command.type(),
                copy[0],
                copy[1],
                command.targetType(),
                command.targetId(),
                Map.of("source", "admin_test_notification")
        );

        PushDispatchResultView dispatchResult = command.dispatch()
                ? dispatchPendingPushDeliveries()
                : null;

        return new AdminTestNotificationView(notification, dispatchResult);
    }

    public PushDispatchResultView dispatchPendingPushDeliveries() {
        PushDispatchService.PushDispatchResult result = pushDispatchService.dispatchPendingDeliveries(null);
        return new PushDispatchResultView(
                result.processed(),
                result.sent(),
                result.failed(),
                result.invalid(),
                result.skipped()
        );
    }

    private AdminTargetPreviewView toUserPreview(AdminOperationsRepository.UserPreviewRecord record) {
        String status = record.deletedAt() != null
                ? "deleted"
                : record.deactivatedAt() != null ? "deactivated" : "active";
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("role", record.role());
        metadata.put("phone_present", record.phone() != null && !record.phone().isBlank());
        return new AdminTargetPreviewView(
                "user",
                record.id(),
                true,
                record.name(),
                record.email(),
                status,
                record.id(),
                metadata
        );
    }

    private AdminTargetPreviewView toInterviewPostPreview(AdminOperationsRepository.InterviewPostPreviewRecord record) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("interview_mode", record.interviewMode());
        metadata.put("reward_amount", record.rewardAmount());
        metadata.put(
                "location",
                firstNonBlank(record.locationPlaceName(), record.locationAddress(), record.locationText())
        );
        return new AdminTargetPreviewView(
                "interview_post",
                record.id(),
                true,
                record.title(),
                truncate(record.serviceSummary(), 160),
                record.status(),
                record.founderId(),
                metadata
        );
    }

    private AdminTargetPreviewView toApplicationPreview(AdminOperationsRepository.ApplicationPreviewRecord record) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("interview_post_id", String.valueOf(record.interviewPostId()));
        metadata.put("moderation_status", record.moderationStatus());
        metadata.put("answer_count", record.answers() == null ? 0 : record.answers().size());
        String summary = record.availableTimes() == null || record.availableTimes().isEmpty()
                ? "가능 시간 없음"
                : String.join(", ", record.availableTimes().subList(0, Math.min(2, record.availableTimes().size())));
        return new AdminTargetPreviewView(
                "application",
                record.id(),
                true,
                "지원 " + record.id().toString().substring(0, 8),
                summary,
                record.status(),
                record.respondentId(),
                metadata
        );
    }

    private AdminTargetPreviewView toChatRoomPreview(AdminOperationsRepository.ChatRoomPreviewRecord record) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("interview_post_id", String.valueOf(record.interviewPostId()));
        metadata.put("application_id", String.valueOf(record.applicationId()));
        metadata.put("respondent_id", String.valueOf(record.respondentId()));
        return new AdminTargetPreviewView(
                "chat_room",
                record.id(),
                true,
                "채팅방 " + record.id().toString().substring(0, 8),
                "founder=" + record.founderId() + " respondent=" + record.respondentId(),
                record.status(),
                record.founderId(),
                metadata
        );
    }

    private AdminTargetPreviewView toChatMessagePreview(AdminOperationsRepository.ChatMessagePreviewRecord record) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("room_id", String.valueOf(record.roomId()));
        metadata.put("message_type", record.messageType());
        metadata.put("hidden_reason", record.hiddenReason());
        return new AdminTargetPreviewView(
                "chat_message",
                record.id(),
                true,
                "메시지 " + record.id().toString().substring(0, 8),
                truncate(record.body(), 180),
                record.hiddenAt() != null ? "hidden" : "visible",
                record.senderId(),
                metadata
        );
    }

    private AdminTargetPreviewView toSessionPreview(AdminOperationsRepository.SessionPreviewRecord record) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("application_id", String.valueOf(record.applicationId()));
        metadata.put("meeting_type", record.meetingType());
        metadata.put("moderation_status", record.moderationStatus());
        return new AdminTargetPreviewView(
                "session",
                record.id(),
                true,
                "인터뷰 일정 " + record.scheduledAt(),
                firstNonBlank(record.place(), record.meetingUrl(), record.meetingType()),
                record.status(),
                null,
                metadata
        );
    }

    private AdminTargetPreviewView missing(String targetType, UUID targetId) {
        return new AdminTargetPreviewView(targetType, targetId, false, null, null, null, null, Map.of());
    }

    private String[] testNotificationCopy(String type) {
        return switch (type) {
            case "chat_message" -> new String[]{"테스트 메시지 알림이에요", "채팅 알림 라우팅을 확인해 주세요."};
            case "support_replied" -> new String[]{"문의 답변 테스트예요", "문의 답변 알림 라우팅을 확인해 주세요."};
            case "application_created" -> new String[]{"신청 알림 테스트예요", "새 신청 알림 라우팅을 확인해 주세요."};
            case "application_selected" -> new String[]{"선정 알림 테스트예요", "선정 알림 라우팅을 확인해 주세요."};
            case "application_rejected" -> new String[]{"반려 알림 테스트예요", "반려 알림 라우팅을 확인해 주세요."};
            case "session_rescheduled" -> new String[]{"일정 변경 테스트예요", "일정 알림 라우팅을 확인해 주세요."};
            case "session_canceled" -> new String[]{"일정 취소 테스트예요", "일정 알림 라우팅을 확인해 주세요."};
            case "no_show_marked" -> new String[]{"불참 처리 테스트예요", "불참 알림 라우팅을 확인해 주세요."};
            default -> new String[]{"Hypofit 테스트 알림이에요", "알림 라우팅을 확인해 주세요."};
        };
    }

    private String firstNonBlank(String... candidates) {
        for (String candidate : candidates) {
            if (candidate != null && !candidate.isBlank()) {
                return candidate;
            }
        }
        return null;
    }

    private String truncate(String value, int length) {
        if (value == null || value.length() <= length) {
            return value;
        }
        return value.substring(0, length);
    }

    public record AdminSupportSummaryView(
            int open,
            int inReview,
            int reportsOpen,
            int accountDeletionOpen
    ) {
    }

    public record AdminHealthSummaryView(
            String api,
            String database,
            String push,
            String outboundEmail
    ) {
    }

    public record AdminSummaryView(
            AdminSupportSummaryView support,
            AdminHealthSummaryView health
    ) {
    }

    public record AdminTargetPreviewView(
            String targetType,
            UUID targetId,
            boolean exists,
            String title,
            String summary,
            String status,
            UUID ownerUserId,
            Map<String, Object> metadata
    ) {
    }

    public record AdminTestNotificationCommand(
            String email,
            String type,
            String targetType,
            UUID targetId,
            boolean dispatch
    ) {
    }

    public record AdminTestNotificationView(
            NotificationReadModel notification,
            PushDispatchResultView dispatchResult
    ) {
    }

    public record PushDispatchResultView(
            int processed,
            int sent,
            int failed,
            int invalid,
            int skipped
    ) {
    }
}
