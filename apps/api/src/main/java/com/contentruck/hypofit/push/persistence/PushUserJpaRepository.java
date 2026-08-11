package com.contentruck.hypofit.push.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushUserJpaRepository extends JpaRepository<PushUserEntity, UUID> {
}
