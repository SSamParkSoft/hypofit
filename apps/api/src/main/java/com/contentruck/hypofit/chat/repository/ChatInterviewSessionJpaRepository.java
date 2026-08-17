package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatInterviewSessionEntity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatInterviewSessionJpaRepository extends JpaRepository<ChatInterviewSessionEntity, UUID> {
    Optional<ChatInterviewSessionEntity> findFirstByApplicationIdAndModerationStatusOrderByCreatedAtDescIdDesc(
            UUID applicationId,
            String moderationStatus
    );
}
