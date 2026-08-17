package com.contentruck.hypofit.socialauth.repository;

import com.contentruck.hypofit.socialauth.entity.SocialAuthAttemptEntity;
import com.contentruck.hypofit.socialauth.entity.SocialAuthIdentityEntity;
import com.contentruck.hypofit.socialauth.entity.SocialAuthUserAccountEntity;
import com.contentruck.hypofit.socialauth.service.SocialAuthRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class SocialAuthRepositoryAdapter implements SocialAuthRepository {

    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;

    public SocialAuthRepositoryAdapter(
            EntityManager entityManager,
            ObjectMapper objectMapper
    ) {
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<UserAccountRecord> findUserAccount(UUID userId) {
        SocialAuthUserAccountEntity entity = entityManager.find(SocialAuthUserAccountEntity.class, userId);
        if (entity == null) {
            return Optional.empty();
        }
        return Optional.of(new UserAccountRecord(
                entity.getId(),
                entity.getEmail(),
                entity.getDeletedAt(),
                entity.getDeactivatedAt()
        ));
    }

    @Override
    public Optional<UserAccountRecord> findUserAccountByEmail(String email) {
        List<SocialAuthUserAccountEntity> results = entityManager.createQuery(
                        """
                        select user
                        from SocialAuthUserAccountEntity user
                        where lower(user.email) = lower(:email)
                        """,
                        SocialAuthUserAccountEntity.class
                )
                .setParameter("email", email)
                .setMaxResults(1)
                .getResultList();
        if (results.isEmpty()) {
            return Optional.empty();
        }
        SocialAuthUserAccountEntity entity = results.getFirst();
        return Optional.of(new UserAccountRecord(
                entity.getId(),
                entity.getEmail(),
                entity.getDeletedAt(),
                entity.getDeactivatedAt()
        ));
    }

    @Override
    public List<SocialAuthIdentityEntity> listUserIdentities(UUID userId) {
        return entityManager.createQuery(
                        """
                        select identity
                        from SocialAuthIdentityEntity identity
                        where identity.userId = :userId
                        order by identity.linkedAt asc
                        """,
                        SocialAuthIdentityEntity.class
                )
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public SocialAuthAttemptEntity createAttempt(SocialAuthAttemptEntity attempt) {
        entityManager.persist(attempt);
        return attempt;
    }

    @Override
    public Optional<SocialAuthAttemptEntity> findAttemptForUpdate(UUID attemptId) {
        List<SocialAuthAttemptEntity> results = entityManager.createQuery(
                        """
                        select attempt
                        from SocialAuthAttemptEntity attempt
                        where attempt.id = :attemptId
                        """,
                        SocialAuthAttemptEntity.class
                )
                .setParameter("attemptId", attemptId)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .getResultList();
        return results.stream().findFirst();
    }

    @Override
    public Optional<SocialAuthIdentityEntity> findIdentityByProviderSubject(String provider, String providerSubjectHash) {
        List<SocialAuthIdentityEntity> results = entityManager.createQuery(
                        """
                        select identity
                        from SocialAuthIdentityEntity identity
                        where identity.provider = :provider
                          and identity.providerSubjectHash = :providerSubjectHash
                        """,
                        SocialAuthIdentityEntity.class
                )
                .setParameter("provider", provider)
                .setParameter("providerSubjectHash", providerSubjectHash)
                .setMaxResults(1)
                .getResultList();
        return results.stream().findFirst();
    }

    @Override
    public Optional<SocialAuthIdentityEntity> findIdentityBySupabaseIdentityId(String supabaseIdentityId) {
        List<SocialAuthIdentityEntity> results = entityManager.createQuery(
                        """
                        select identity
                        from SocialAuthIdentityEntity identity
                        where identity.supabaseIdentityId = :supabaseIdentityId
                        """,
                        SocialAuthIdentityEntity.class
                )
                .setParameter("supabaseIdentityId", supabaseIdentityId)
                .setMaxResults(1)
                .getResultList();
        return results.stream().findFirst();
    }

    @Override
    public Optional<SocialAuthIdentityEntity> findIdentityByUserAndProvider(UUID userId, String provider) {
        List<SocialAuthIdentityEntity> results = entityManager.createQuery(
                        """
                        select identity
                        from SocialAuthIdentityEntity identity
                        where identity.userId = :userId
                          and identity.provider = :provider
                        """,
                        SocialAuthIdentityEntity.class
                )
                .setParameter("userId", userId)
                .setParameter("provider", provider)
                .setMaxResults(1)
                .getResultList();
        return results.stream().findFirst();
    }

    @Override
    public void lockIdentityKeys(
            UUID userId,
            String provider,
            String providerSubjectHash,
            String supabaseIdentityId
    ) {
        List<String> lockKeys = new ArrayList<>(3);
        lockKeys.add("social-auth:user-provider:" + userId + ":" + provider);
        lockKeys.add("social-auth:provider-subject:" + provider + ":" + providerSubjectHash);
        lockKeys.add("social-auth:supabase-identity:" + supabaseIdentityId);
        Collections.sort(lockKeys);
        for (String lockKey : lockKeys) {
            entityManager.createNativeQuery(
                            "select pg_advisory_xact_lock(hashtextextended(cast(:lockKey as text), 0))"
                    )
                    .setParameter("lockKey", lockKey)
                    .getSingleResult();
        }
    }

    @Override
    public SocialAuthIdentityEntity upsertIdentity(
            SocialAuthIdentityEntity existing,
            UUID userId,
            String provider,
            String providerSubjectHash,
            String supabaseIdentityId,
            String providerEmail,
            Boolean providerEmailVerified,
            OffsetDateTime usedAt
    ) {
        boolean isNew = existing == null;
        SocialAuthIdentityEntity entity = existing;
        if (isNew) {
            entity = new SocialAuthIdentityEntity();
            entity.setId(UUID.randomUUID());
            entity.setLinkedAt(usedAt);
        }
        entity.setUserId(userId);
        entity.setProvider(provider);
        entity.setProviderSubjectHash(providerSubjectHash);
        entity.setSupabaseIdentityId(supabaseIdentityId);
        entity.setProviderEmail(providerEmail);
        entity.setProviderEmailVerified(providerEmailVerified);
        entity.setStatus("active");
        entity.setLastUsedAt(usedAt);
        entity.setRevokedAt(null);
        if (isNew) {
            entityManager.persist(entity);
        }
        entityManager.flush();
        return entity;
    }

    @Override
    public void setIdentityEmailForwarding(SocialAuthIdentityEntity identity, Boolean emailForwardingEnabled) {
        identity.setEmailForwardingEnabled(emailForwardingEnabled);
        entityManager.flush();
    }

    @Override
    public void revokeIdentity(SocialAuthIdentityEntity identity, OffsetDateTime revokedAt) {
        identity.setStatus("revoked");
        identity.setRevokedAt(revokedAt);
        entityManager.flush();
    }

    @Override
    public boolean createProviderEvent(
            String provider,
            String eventType,
            String providerSubjectHash,
            String providerEventIdHash,
            UUID socialAuthIdentityId
    ) {
        int inserted = entityManager.createNativeQuery("""
                        insert into social_auth_provider_events (
                          id,
                          provider,
                          event_type,
                          provider_subject_hash,
                          provider_event_id_hash,
                          social_auth_identity_id
                        ) values (
                          :id,
                          :provider,
                          :eventType,
                          :providerSubjectHash,
                          :providerEventIdHash,
                          :socialAuthIdentityId
                        )
                        on conflict on constraint uq_social_auth_provider_event_provider_event_id do nothing
                        """)
                .setParameter("id", UUID.randomUUID())
                .setParameter("provider", provider)
                .setParameter("eventType", eventType)
                .setParameter("providerSubjectHash", providerSubjectHash)
                .setParameter("providerEventIdHash", providerEventIdHash)
                .setParameter("socialAuthIdentityId", socialAuthIdentityId)
                .executeUpdate();
        return inserted > 0;
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

    private String writeJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize social auth audit metadata JSON", exception);
        }
    }
}
