package com.contentruck.hypofit.support.dto;

import com.contentruck.hypofit.support.service.SupportTicketReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SupportTicketResponse(
        UUID id,
        @JsonProperty("user_id") UUID userId,
        String kind,
        String category,
        String subject,
        String body,
        @JsonProperty("contact_email") String contactEmail,
        @JsonProperty("target_type") String targetType,
        @JsonProperty("target_id") UUID targetId,
        String status,
        @JsonProperty("deleted_by_user_at") OffsetDateTime deletedByUserAt,
        Map<String, Object> metadata,
        @JsonProperty("created_at") OffsetDateTime createdAt,
        @JsonProperty("updated_at") OffsetDateTime updatedAt,
        List<SupportTicketReplyResponse> replies
) {

    public static SupportTicketResponse from(SupportTicketReadModel model) {
        return new SupportTicketResponse(
                model.id(),
                model.userId(),
                model.kind(),
                model.category(),
                model.subject(),
                model.body(),
                model.contactEmail(),
                model.targetType(),
                model.targetId(),
                model.status(),
                model.deletedByUserAt(),
                model.metadata(),
                model.createdAt(),
                model.updatedAt(),
                model.replies().stream().map(SupportTicketReplyResponse::from).toList()
        );
    }
}
