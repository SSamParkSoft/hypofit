package com.contentruck.hypofit.chat.service;

import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Message persistence, pagination and retry-safe user-message creation. */
public interface ChatMessageRepository {

    List<ChatMessageReadModel> findMessages(UUID roomId, int limit, OffsetDateTime before, UUID beforeId);

    Map<UUID, ChatMessageReadModel> findLatestMessages(List<UUID> roomIds);

    Optional<ChatMessageEntity> findMessage(UUID roomId, UUID messageId);

    Optional<ChatMessageEntity> findMessageByClientMessageId(UUID roomId, UUID senderId, String clientMessageId);

    CreateUserMessageResult createUserMessage(ChatRoomEntity room, UUID senderId, String body, String clientMessageId);

    ChatRoomParticipantSettingEntity markRoomRead(UUID roomId, UUID userId, OffsetDateTime readAt);

    record CreateUserMessageResult(ChatMessageEntity message, boolean created) {
    }
}
