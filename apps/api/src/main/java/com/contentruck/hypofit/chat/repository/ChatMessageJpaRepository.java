package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatMessageEntity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageJpaRepository extends JpaRepository<ChatMessageEntity, UUID> {
    Optional<ChatMessageEntity> findByRoomIdAndId(UUID roomId, UUID id);

    Optional<ChatMessageEntity> findByRoomIdAndSenderIdAndClientMessageId(
            UUID roomId,
            UUID senderId,
            String clientMessageId
    );
}
