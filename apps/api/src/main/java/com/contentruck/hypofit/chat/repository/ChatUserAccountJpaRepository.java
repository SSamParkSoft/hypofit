package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatUserAccountEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatUserAccountJpaRepository extends JpaRepository<ChatUserAccountEntity, UUID> {
}
