package com.contentruck.hypofit.notification.repository;

import com.contentruck.hypofit.notification.entity.NotificationUserEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationUserJpaRepository extends JpaRepository<NotificationUserEntity, UUID> {
}
