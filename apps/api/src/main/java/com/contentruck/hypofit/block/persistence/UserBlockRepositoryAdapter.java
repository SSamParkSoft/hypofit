package com.contentruck.hypofit.block.persistence;

import com.contentruck.hypofit.block.application.UserBlockRepository;
import com.contentruck.hypofit.block.domain.BlockActorAccount;
import com.contentruck.hypofit.block.domain.BlockedUserSummary;
import com.contentruck.hypofit.block.domain.UserBlockReadModel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class UserBlockRepositoryAdapter implements UserBlockRepository {

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public UserBlockRepositoryAdapter(
            EntityManager entityManager,
            ObjectMapper objectMapper
    ) {
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<BlockActorAccount> findUserAccount(UUID userId) {
        BlockUserAccountEntity entity = entityManager.find(BlockUserAccountEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new BlockActorAccount(
                entity.getId(),
                entity.getEmail(),
                entity.getDeletedAt() != null,
                entity.getDeactivatedAt() != null
        ));
    }

    @Override
    public Optional<BlockedUserSummary> findUserSummary(UUID userId) {
        BlockUserAccountEntity entity = entityManager.find(BlockUserAccountEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(toSummary(entity));
    }

    @Override
    public UserBlockReadModel createOrReactivateBlock(UUID blockerId, UUID blockedUserId, String reason) {
        BlockUserBlockEntity entity = findBlockEntity(blockerId, blockedUserId).orElse(null);
        if (entity == null) {
            entity = new BlockUserBlockEntity();
            entity.setBlockerId(blockerId);
            entity.setBlockedUserId(blockedUserId);
            entity.setReason(reason);
            entity.setSource("user");
            entityManager.persist(entity);
        } else {
            entity.setReason(reason);
            entity.setSource("user");
            entity.setRevokedAt(null);
        }
        entityManager.flush();
        return toReadModel(entity, null);
    }

    @Override
    public Optional<UserBlockReadModel> revokeBlock(UUID blockerId, UUID blockedUserId) {
        Optional<BlockUserBlockEntity> maybeEntity = findBlockEntity(blockerId, blockedUserId);
        if (maybeEntity.isEmpty()) {
            return Optional.empty();
        }
        BlockUserBlockEntity entity = maybeEntity.get();
        entity.setRevokedAt(OffsetDateTime.now(ZoneOffset.UTC));
        entityManager.flush();
        return Optional.of(toReadModel(entity, null));
    }

    @Override
    public List<UserBlockReadModel> listActiveBlocks(UUID blockerId) {
        return entityManager.createQuery(
                        """
                        select b, u
                        from BlockUserBlockEntity b
                        left join BlockUserAccountEntity u on u.id = b.blockedUserId
                        where b.blockerId = :blockerId
                          and b.revokedAt is null
                        order by b.createdAt desc
                        """,
                        Object[].class
                )
                .setParameter("blockerId", blockerId)
                .getResultList()
                .stream()
                .map(row -> toReadModel(
                        (BlockUserBlockEntity) row[0],
                        row[1] == null ? null : toSummary((BlockUserAccountEntity) row[1])
                ))
                .toList();
    }

    @Override
    public void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            String reason,
            Map<String, Object> metadata
    ) {
        entityManager.createNativeQuery("""
                        insert into audit_events (
                          id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          target_type,
                          target_id,
                          reason,
                          metadata
                        ) values (
                          :id,
                          :actorUserId,
                          :actorType,
                          :eventType,
                          :targetType,
                          :targetId,
                          :reason,
                          cast(:metadata as jsonb)
                        )
                        """)
                .setParameter("id", UUID.randomUUID())
                .setParameter("actorUserId", actorUserId)
                .setParameter("actorType", actorType)
                .setParameter("eventType", eventType)
                .setParameter("targetType", targetType)
                .setParameter("targetId", targetId)
                .setParameter("reason", reason)
                .setParameter("metadata", writeJson(metadata))
                .executeUpdate();
    }

    private Optional<BlockUserBlockEntity> findBlockEntity(UUID blockerId, UUID blockedUserId) {
        List<BlockUserBlockEntity> result = entityManager.createQuery(
                        """
                        select b
                        from BlockUserBlockEntity b
                        where b.blockerId = :blockerId
                          and b.blockedUserId = :blockedUserId
                        """,
                        BlockUserBlockEntity.class
                )
                .setParameter("blockerId", blockerId)
                .setParameter("blockedUserId", blockedUserId)
                .getResultList();
        return result.stream().findFirst();
    }

    private BlockedUserSummary toSummary(BlockUserAccountEntity entity) {
        return new BlockedUserSummary(
                entity.getId(),
                entity.getName(),
                entity.getBio(),
                entity.getRole(),
                entity.getProfileImageUrl()
        );
    }

    private UserBlockReadModel toReadModel(BlockUserBlockEntity entity, BlockedUserSummary blockedUser) {
        return new UserBlockReadModel(
                entity.getId(),
                entity.getBlockerId(),
                entity.getBlockedUserId(),
                entity.getReason(),
                entity.getSource(),
                entity.getCreatedAt(),
                entity.getRevokedAt(),
                blockedUser
        );
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize audit metadata JSON", exception);
        }
    }
}
