package com.contentruck.hypofit.accountdeletion.repository;

import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionUserEntity;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountDeletionUserJpaRepository extends JpaRepository<AccountDeletionUserEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select account from AccountDeletionUserEntity account where account.id = :userId")
    Optional<AccountDeletionUserEntity> findForUpdateById(@Param("userId") UUID userId);

    Optional<AccountDeletionUserEntity> findByEmailIgnoreCase(String email);
}
