package com.contentruck.hypofit.chat.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatInterviewSessionJpaRepository extends JpaRepository<ChatInterviewSessionEntity, UUID> {
    Optional<ChatInterviewSessionEntity> findFirstByApplicationIdAndModerationStatusOrderByCreatedAtDescIdDesc(
            UUID applicationId,
            String moderationStatus
    );
}
