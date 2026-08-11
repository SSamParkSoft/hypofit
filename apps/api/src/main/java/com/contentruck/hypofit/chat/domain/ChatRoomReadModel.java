package com.contentruck.hypofit.chat.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatRoomReadModel(
        UUID id,
        UUID interviewPostId,
        UUID applicationId,
        UUID founderId,
        UUID respondentId,
        String status,
        OffsetDateTime lastMessageAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        ChatApplicationSummary application,
        ChatInterviewPostSummary interviewPost,
        ChatUserSummary founder,
        ChatUserSummary respondent,
        ChatMessageReadModel lastMessage,
        int unreadCount,
        boolean isMuted,
        boolean isHidden,
        OffsetDateTime lastReadAt
) {
}
