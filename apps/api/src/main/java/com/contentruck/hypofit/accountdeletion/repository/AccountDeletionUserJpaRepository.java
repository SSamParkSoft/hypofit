package com.contentruck.hypofit.accountdeletion.repository;

import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionUserEntity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountDeletionUserJpaRepository extends JpaRepository<AccountDeletionUserEntity, UUID> {

    Optional<AccountDeletionUserEntity> findByEmailIgnoreCase(String email);
}
