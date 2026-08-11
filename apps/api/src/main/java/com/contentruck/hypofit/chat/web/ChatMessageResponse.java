package com.contentruck.hypofit.chat.web;

import com.contentruck.hypofit.chat.domain.ChatMessageReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        @JsonProperty("room_id")
        UUID roomId,
        @JsonProperty("sender_id")
        UUID senderId,
        @JsonProperty("message_type")
        @Schema(allowableValues = {
                "system",
                "user",
                "application_created",
                "application_selected",
                "application_rejected",
                "schedule_created"
        })
        String messageType,
        String body,
        @JsonProperty("client_message_id")
        String clientMessageId,
        Map<String, Object> metadata,
        @JsonProperty("hidden_at")
        OffsetDateTime hiddenAt,
        @JsonProperty("hidden_reason")
        String hiddenReason,
        @JsonProperty("created_at")
        OffsetDateTime createdAt
) {
    public static ChatMessageResponse from(ChatMessageReadModel model) {
        return new ChatMessageResponse(
                model.id(),
                model.roomId(),
                model.senderId(),
                model.messageType(),
                model.body(),
                model.clientMessageId(),
                model.metadata(),
                model.hiddenAt(),
                model.hiddenReason(),
                model.createdAt()
        );
    }
}
