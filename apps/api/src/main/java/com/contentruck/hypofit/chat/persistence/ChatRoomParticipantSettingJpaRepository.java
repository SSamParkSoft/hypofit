package com.contentruck.hypofit.chat.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomParticipantSettingJpaRepository extends JpaRepository<ChatRoomParticipantSettingEntity, UUID> {
    Optional<ChatRoomParticipantSettingEntity> findByRoomIdAndUserId(UUID roomId, UUID userId);
}
