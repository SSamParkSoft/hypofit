package com.contentruck.hypofit.admin.application;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface AdminAccessRepository {

    Optional<AdminActorRecord> findActorAccount(UUID userId);

    record AdminActorRecord(
            UUID id,
            String email,
            String name,
            OffsetDateTime deletedAt,
            OffsetDateTime deactivatedAt
    ) {
    }
}
