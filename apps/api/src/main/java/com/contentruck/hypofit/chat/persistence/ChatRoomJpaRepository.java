package com.contentruck.hypofit.chat.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomJpaRepository extends JpaRepository<ChatRoomEntity, UUID> {
}
