package com.contentruck.hypofit.maintenance.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaintenanceRepository {
    List<MaintenanceRecord> list();
    Optional<MaintenanceRecord> find(UUID id);
    Optional<MaintenanceRecord> findActive();
    Optional<MaintenanceRecord> findVisibleScheduled(OffsetDateTime now);
    MaintenanceRecord create(UUID actorId, WriteCommand command);
    void linkNotice(UUID id, UUID noticeId);
    MaintenanceRecord update(UUID id, UUID actorId, WriteCommand command);
    MaintenanceRecord transition(UUID id, UUID actorId, String fromStatus, String toStatus, OffsetDateTime now);

    record WriteCommand(String title, String message, OffsetDateTime startsAt, OffsetDateTime endsAt, boolean showBanner, OffsetDateTime bannerStartsAt) { }
    record MaintenanceRecord(UUID id, String title, String message, String status, String mode, OffsetDateTime startsAt, OffsetDateTime endsAt,
                             UUID noticeId, boolean showBanner, OffsetDateTime bannerStartsAt, UUID createdBy, UUID updatedBy,
                             OffsetDateTime startedAt, OffsetDateTime completedAt, long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) { }
}
