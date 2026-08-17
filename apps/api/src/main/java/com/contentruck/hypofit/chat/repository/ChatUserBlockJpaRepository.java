package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatUserBlockEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatUserBlockJpaRepository extends JpaRepository<ChatUserBlockEntity, UUID> {
}
