package com.contentruck.hypofit.admin.web;

import com.contentruck.hypofit.admin.application.AdminAccessService;
import com.contentruck.hypofit.admin.application.AdminOperationsService;
import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

final class AdminOperationsWebModels {

    private AdminOperationsWebModels() {
    }

    record AdminMeResponse(
            UUID id,
            String email,
            String name,
            @Schema(defaultValue = "admin")
            String role
    ) {
        static AdminMeResponse from(AdminAccessService.CurrentAdmin admin) {
            return new AdminMeResponse(admin.id(), admin.email(), admin.name(), "admin");
        }
    }

    record AdminSupportSummaryResponse(
            @Schema(defaultValue = "0")
            int open,
            @JsonProperty("in_review") @Schema(defaultValue = "0") int inReview,
            @JsonProperty("reports_open") @Schema(defaultValue = "0") int reportsOpen,
            @JsonProperty("account_deletion_open") @Schema(defaultValue = "0") int accountDeletionOpen
    ) {
        static AdminSupportSummaryResponse from(AdminOperationsService.AdminSupportSummaryView view) {
            return new AdminSupportSummaryResponse(view.open(), view.inReview(), view.reportsOpen(), view.accountDeletionOpen());
        }
    }

    record AdminHealthSummaryResponse(
            String api,
            String database,
            String push,
            @JsonProperty("outbound_email") String outboundEmail
    ) {
        static AdminHealthSummaryResponse from(AdminOperationsService.AdminHealthSummaryView view) {
            return new AdminHealthSummaryResponse(view.api(), view.database(), view.push(), view.outboundEmail());
        }
    }

    record AdminSummaryResponse(
            AdminSupportSummaryResponse support,
            AdminHealthSummaryResponse health
    ) {
        static AdminSummaryResponse from(AdminOperationsService.AdminSummaryView view) {
            return new AdminSummaryResponse(
                    AdminSupportSummaryResponse.from(view.support()),
                    AdminHealthSummaryResponse.from(view.health())
            );
        }
    }

    record AdminTargetPreviewResponse(
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
        static AdminTargetPreviewResponse from(AdminOperationsService.AdminTargetPreviewView view) {
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
        static PushDispatchResultResponse from(AdminOperationsService.PushDispatchResultView view) {
            if (view == null) {
                return null;
            }
            return new PushDispatchResultResponse(view.processed(), view.sent(), view.failed(), view.invalid(), view.skipped());
        }
    }

    record AdminTestNotificationResponse(
            NotificationResponse notification,
            @JsonProperty("dispatch_result") PushDispatchResultResponse dispatchResult
    ) {
        static AdminTestNotificationResponse from(AdminOperationsService.AdminTestNotificationView view) {
            return new AdminTestNotificationResponse(
                    NotificationResponse.from(view.notification()),
                    PushDispatchResultResponse.from(view.dispatchResult())
            );
        }
    }

    record NotificationResponse(
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
        static NotificationResponse from(AdminOperationsService.AdminTestNotificationView view) {
            return from(view.notification());
        }

        static NotificationResponse from(NotificationReadModel record) {
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
