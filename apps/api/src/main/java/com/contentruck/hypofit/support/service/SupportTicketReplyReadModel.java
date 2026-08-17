package com.contentruck.hypofit.support.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SupportTicketReplyReadModel(
        UUID id,
        UUID ticketId,
        String message,
        OffsetDateTime createdAt
) {
}
