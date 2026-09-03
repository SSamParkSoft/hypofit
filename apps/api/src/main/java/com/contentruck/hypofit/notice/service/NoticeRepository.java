package com.contentruck.hypofit.notice.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoticeRepository {

    List<NoticeRecord> listPublished();

    Optional<NoticeRecord> findPublished(UUID id);

    List<NoticeRecord> listAll();

    Optional<NoticeRecord> find(UUID id);

    NoticeRecord insert(UUID actorId, NoticeWriteCommand command);

    NoticeRecord update(UUID id, UUID actorId, NoticeWriteCommand command);

    NoticeRecord changeStatus(UUID id, UUID actorId, String fromStatus, String toStatus, OffsetDateTime publishedAt);

    record NoticeWriteCommand(String type, String title, String body) {
    }

    record NoticeRecord(
            UUID id,
            String type,
            String title,
            String body,
            String status,
            OffsetDateTime publishedAt,
            UUID createdBy,
            UUID updatedBy,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
