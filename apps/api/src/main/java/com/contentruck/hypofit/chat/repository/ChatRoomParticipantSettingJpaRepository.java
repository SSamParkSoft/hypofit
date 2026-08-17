package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomParticipantSettingJpaRepository extends JpaRepository<ChatRoomParticipantSettingEntity, UUID> {
    Optional<ChatRoomParticipantSettingEntity> findByRoomIdAndUserId(UUID roomId, UUID userId);
}
