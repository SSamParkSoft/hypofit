package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatRoomEntity;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomJpaRepository extends JpaRepository<ChatRoomEntity, UUID> {
}
