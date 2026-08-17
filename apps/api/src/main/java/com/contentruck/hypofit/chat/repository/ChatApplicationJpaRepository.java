package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatApplicationEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatApplicationJpaRepository extends JpaRepository<ChatApplicationEntity, UUID> {
}
