package com.contentruck.hypofit.push.repository;

import com.contentruck.hypofit.push.entity.PushUserEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PushUserJpaRepository extends JpaRepository<PushUserEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from PushUserEntity account where account.id = :userId")
    Optional<PushUserEntity> findForUpdateById(@Param("userId") UUID userId);
}
