package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatNotificationEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatNotificationJpaRepository extends JpaRepository<ChatNotificationEntity, UUID> {
}
