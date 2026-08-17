package com.contentruck.hypofit.accountdeletion.repository;

import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionPushDeviceEntity;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountDeletionPushDeviceJpaRepository extends JpaRepository<AccountDeletionPushDeviceEntity, UUID> {

    List<AccountDeletionPushDeviceEntity> findAllByUserIdAndEnabledTrue(UUID userId);
}
