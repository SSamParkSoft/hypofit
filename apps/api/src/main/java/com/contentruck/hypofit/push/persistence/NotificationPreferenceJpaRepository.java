package com.contentruck.hypofit.push.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceJpaRepository extends JpaRepository<NotificationPreferenceEntity, UUID> {
}
