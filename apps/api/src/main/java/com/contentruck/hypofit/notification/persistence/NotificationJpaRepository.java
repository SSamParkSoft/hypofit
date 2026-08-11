package com.contentruck.hypofit.notification.persistence;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationJpaRepository extends JpaRepository<NotificationEntity, UUID> {

    List<NotificationEntity> findByUserIdOrderByCreatedAtDescIdDesc(UUID userId, Pageable pageable);

    List<NotificationEntity> findByUserIdAndReadAtIsNullOrderByCreatedAtDescIdDesc(UUID userId, Pageable pageable);

    Optional<NotificationEntity> findByIdAndUserId(UUID id, UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update NotificationEntity n
               set n.readAt = :readAt
             where n.userId = :userId
               and n.readAt is null
            """)
    int markAllUnreadRead(@Param("userId") UUID userId, @Param("readAt") OffsetDateTime readAt);
}
