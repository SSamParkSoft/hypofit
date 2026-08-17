package com.contentruck.hypofit.support.dto;

import com.contentruck.hypofit.support.service.SupportTicketReplyReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SupportTicketReplyResponse(
        UUID id,
        @JsonProperty("ticket_id") UUID ticketId,
        String message,
        @JsonProperty("created_at") OffsetDateTime createdAt
) {

    static SupportTicketReplyResponse from(SupportTicketReplyReadModel model) {
        return new SupportTicketReplyResponse(
                model.id(),
                model.ticketId(),
                model.message(),
                model.createdAt()
        );
    }
}
