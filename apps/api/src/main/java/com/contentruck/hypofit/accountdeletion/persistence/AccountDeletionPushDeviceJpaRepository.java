package com.contentruck.hypofit.accountdeletion.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountDeletionPushDeviceJpaRepository extends JpaRepository<AccountDeletionPushDeviceEntity, UUID> {

    List<AccountDeletionPushDeviceEntity> findAllByUserIdAndEnabledTrue(UUID userId);
}
