package com.contentruck.hypofit.chat.service;

import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatRepository {

    List<ChatRoomReadModel> findRoomsForUser(UUID userId);

    Optional<CurrentUserAccountRecord> findCurrentUserAccount(UUID userId);

    Optional<ChatRoomReadModel> findRoom(UUID roomId, UUID userId);

    Optional<ChatRoomEntity> findRoomEntity(UUID roomId);

    void ensureRoomForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    void markSelectedForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    void markRejectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId,
            String rejectionReason
    );

    void markCanceledForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    ChatRoomParticipantSettingEntity updateRoomSettings(
            UUID roomId,
            UUID userId,
            Boolean isMuted,
            Boolean isHidden
    );

    boolean hasActiveBlockBetween(UUID userAId, UUID userBId);

    record CurrentUserAccountRecord(
            UUID id,
            String role,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }

}
