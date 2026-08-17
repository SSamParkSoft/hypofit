package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatRoomReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatRoomResponse(
        UUID id,
        @JsonProperty("interview_post_id")
        UUID interviewPostId,
        @JsonProperty("application_id")
        UUID applicationId,
        @JsonProperty("founder_id")
        UUID founderId,
        @JsonProperty("respondent_id")
        UUID respondentId,
        @Schema(allowableValues = {"open", "selected", "closed", "blocked"})
        String status,
        @JsonProperty("last_message_at")
        OffsetDateTime lastMessageAt,
        @JsonProperty("created_at")
        OffsetDateTime createdAt,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt,
        ChatApplicationResponse application,
        @JsonProperty("interview_post")
        ChatInterviewPostResponse interviewPost,
        ChatUserSummaryResponse founder,
        ChatUserSummaryResponse respondent,
        @JsonProperty("last_message")
        ChatMessageResponse lastMessage,
        @JsonProperty("unread_count")
        @Schema(defaultValue = "0")
        int unreadCount,
        @JsonProperty("is_muted")
        @Schema(defaultValue = "false")
        boolean isMuted,
        @JsonProperty("is_hidden")
        @Schema(defaultValue = "false")
        boolean isHidden,
        @JsonProperty("last_read_at")
        OffsetDateTime lastReadAt
) {
    public static ChatRoomResponse from(ChatRoomReadModel model) {
        return new ChatRoomResponse(
                model.id(),
                model.interviewPostId(),
                model.applicationId(),
                model.founderId(),
                model.respondentId(),
                model.status(),
                model.lastMessageAt(),
                model.createdAt(),
                model.updatedAt(),
                ChatApplicationResponse.from(model.application()),
                ChatInterviewPostResponse.from(model.interviewPost()),
                ChatUserSummaryResponse.from(model.founder()),
                ChatUserSummaryResponse.from(model.respondent()),
                model.lastMessage() == null ? null : ChatMessageResponse.from(model.lastMessage()),
                model.unreadCount(),
                model.isMuted(),
                model.isHidden(),
                model.lastReadAt()
        );
    }
}
