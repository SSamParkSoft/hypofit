package com.contentruck.hypofit.push.repository;

import com.contentruck.hypofit.push.entity.NotificationPreferenceEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationPreferenceJpaRepository extends JpaRepository<NotificationPreferenceEntity, UUID> {
}
