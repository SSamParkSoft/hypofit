package com.contentruck.hypofit.push.persistence;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushDeviceJpaRepository extends JpaRepository<PushDeviceEntity, UUID> {

    Optional<PushDeviceEntity> findByProviderAndEnvironmentAndTokenHash(
            String provider,
            String environment,
            String tokenHash
    );

    Optional<PushDeviceEntity> findByIdAndUserId(UUID id, UUID userId);
}
