package com.contentruck.hypofit.push.repository;

import com.contentruck.hypofit.push.entity.PushUserEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushUserJpaRepository extends JpaRepository<PushUserEntity, UUID> {
}
