package com.contentruck.hypofit.admin.dto;

import com.contentruck.hypofit.admin.service.AdminAccessService;
import com.contentruck.hypofit.admin.service.AdminOperationsService;
import com.contentruck.hypofit.notification.service.NotificationReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public final class AdminOperationsWebModels {

    private AdminOperationsWebModels() {
    }

    public record AdminMeResponse(
            UUID id,
            String email,
            String name,
            @Schema(defaultValue = "admin")
            String role
    ) {
        public static AdminMeResponse from(AdminAccessService.CurrentAdmin admin) {
            return new AdminMeResponse(admin.id(), admin.email(), admin.name(), "admin");
        }
    }

    public record AdminSupportSummaryResponse(
            @Schema(defaultValue = "0")
            int open,
            @JsonProperty("in_review") @Schema(defaultValue = "0") int inReview,
            @JsonProperty("reports_open") @Schema(defaultValue = "0") int reportsOpen,
            @JsonProperty("account_deletion_open") @Schema(defaultValue = "0") int accountDeletionOpen
    ) {
        public static AdminSupportSummaryResponse from(AdminOperationsService.AdminSupportSummaryView view) {
            return new AdminSupportSummaryResponse(view.open(), view.inReview(), view.reportsOpen(), view.accountDeletionOpen());
        }
    }

    public record AdminHealthSummaryResponse(
            String api,
            String database,
            String push,
            @JsonProperty("outbound_email") String outboundEmail
    ) {
        public static AdminHealthSummaryResponse from(AdminOperationsService.AdminHealthSummaryView view) {
            return new AdminHealthSummaryResponse(view.api(), view.database(), view.push(), view.outboundEmail());
        }
    }

    public record AdminSummaryResponse(
            AdminSupportSummaryResponse support,
            AdminHealthSummaryResponse health
    ) {
        public static AdminSummaryResponse from(AdminOperationsService.AdminSummaryView view) {
            return new AdminSummaryResponse(
                    AdminSupportSummaryResponse.from(view.support()),
                    AdminHealthSummaryResponse.from(view.health())
            );
        }
    }

    public record AdminTargetPreviewResponse(
            @JsonProperty("target_type")
            @Schema(allowableValues = {"application", "chat_message", "chat_room", "interview_post", "session", "user"})
            String targetType,
            @JsonProperty("target_id") UUID targetId,
            boolean exists,
            String title,
            String summary,
            String status,
            @JsonProperty("owner_user_id") UUID ownerUserId,
            Map<String, Object> metadata
    ) {
        public static AdminTargetPreviewResponse from(AdminOperationsService.AdminTargetPreviewView view) {
            return new AdminTargetPreviewResponse(
                    view.targetType(),
                    view.targetId(),
                    view.exists(),
                    view.title(),
                    view.summary(),
                    view.status(),
                    view.ownerUserId(),
                    view.metadata()
            );
        }
    }

    public record PushDispatchResultResponse(
            int processed,
            int sent,
            int failed,
            int invalid,
            int skipped
    ) {
        public static PushDispatchResultResponse from(AdminOperationsService.PushDispatchResultView view) {
            if (view == null) {
                return null;
            }
            return new PushDispatchResultResponse(view.processed(), view.sent(), view.failed(), view.invalid(), view.skipped());
        }
    }

    public record AdminTestNotificationResponse(
            NotificationResponse notification,
            @JsonProperty("dispatch_result") PushDispatchResultResponse dispatchResult
    ) {
        public static AdminTestNotificationResponse from(AdminOperationsService.AdminTestNotificationView view) {
            return new AdminTestNotificationResponse(
                    NotificationResponse.from(view.notification()),
                    PushDispatchResultResponse.from(view.dispatchResult())
            );
        }
    }

    public record NotificationResponse(
            UUID id,
            @JsonProperty("user_id") UUID userId,
            String type,
            String title,
            String body,
            @JsonProperty("target_type") String targetType,
            @JsonProperty("target_id") UUID targetId,
            Map<String, Object> metadata,
            @JsonProperty("read_at") OffsetDateTime readAt,
            @JsonProperty("created_at") OffsetDateTime createdAt
    ) {
        public static NotificationResponse from(AdminOperationsService.AdminTestNotificationView view) {
            return from(view.notification());
        }

        public static NotificationResponse from(NotificationReadModel record) {
            return new NotificationResponse(
                    record.id(),
                    record.userId(),
                    record.type(),
                    record.title(),
                    record.body(),
                    record.targetType(),
                    record.targetId(),
                    record.metadata(),
                    record.readAt(),
                    record.createdAt()
            );
        }
    }
}
