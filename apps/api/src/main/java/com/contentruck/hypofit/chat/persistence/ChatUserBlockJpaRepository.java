package com.contentruck.hypofit.chat.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatUserBlockJpaRepository extends JpaRepository<ChatUserBlockEntity, UUID> {
}
