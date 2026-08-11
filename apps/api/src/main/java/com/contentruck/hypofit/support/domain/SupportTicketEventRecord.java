package com.contentruck.hypofit.support.domain;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record SupportTicketEventRecord(
        UUID id,
        UUID ticketId,
        UUID actorUserId,
        String actorType,
        String eventType,
        String fromStatus,
        String toStatus,
        String message,
        Map<String, Object> metadata,
        OffsetDateTime createdAt
) {
}
