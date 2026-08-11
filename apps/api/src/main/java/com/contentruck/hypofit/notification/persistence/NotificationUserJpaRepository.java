package com.contentruck.hypofit.notification.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationUserJpaRepository extends JpaRepository<NotificationUserEntity, UUID> {
}
