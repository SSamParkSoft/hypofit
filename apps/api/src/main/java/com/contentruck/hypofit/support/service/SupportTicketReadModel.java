package com.contentruck.hypofit.support.service;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record SupportTicketReadModel(
        UUID id,
        UUID userId,
        String kind,
        String category,
        String subject,
        String body,
        String contactEmail,
        String targetType,
        UUID targetId,
        String status,
        OffsetDateTime deletedByUserAt,
        Map<String, Object> metadata,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<SupportTicketReplyReadModel> replies
) {

    public SupportTicketReadModel {
        metadata = metadata == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(metadata));
        replies = replies == null ? List.of() : List.copyOf(replies);
    }

    public SupportTicketReadModel withReplies(List<SupportTicketReplyReadModel> replies) {
        return new SupportTicketReadModel(
                id,
                userId,
                kind,
                category,
                subject,
                body,
                contactEmail,
                targetType,
                targetId,
                status,
                deletedByUserAt,
                metadata,
                createdAt,
                updatedAt,
                replies
        );
    }
}
