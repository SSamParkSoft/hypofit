package com.contentruck.hypofit.support.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SupportTicketReplyReadModel(
        UUID id,
        UUID ticketId,
        String message,
        OffsetDateTime createdAt
) {
}
