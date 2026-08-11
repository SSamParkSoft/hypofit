package com.contentruck.hypofit.socialauth.application;

import com.contentruck.hypofit.socialauth.persistence.SocialAuthAttemptEntity;
import com.contentruck.hypofit.socialauth.persistence.SocialAuthIdentityEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface SocialAuthRepository {

    Optional<UserAccountRecord> findUserAccount(UUID userId);

    Optional<UserAccountRecord> findUserAccountByEmail(String email);

    List<SocialAuthIdentityEntity> listUserIdentities(UUID userId);

    SocialAuthAttemptEntity createAttempt(SocialAuthAttemptEntity attempt);

    Optional<SocialAuthAttemptEntity> findAttemptForUpdate(UUID attemptId);

    Optional<SocialAuthIdentityEntity> findIdentityByProviderSubject(String provider, String providerSubjectHash);

    Optional<SocialAuthIdentityEntity> findIdentityBySupabaseIdentityId(String supabaseIdentityId);

    Optional<SocialAuthIdentityEntity> findIdentityByUserAndProvider(UUID userId, String provider);

    void lockIdentityKeys(
            UUID userId,
            String provider,
            String providerSubjectHash,
            String supabaseIdentityId
    );

    SocialAuthIdentityEntity upsertIdentity(
            SocialAuthIdentityEntity existing,
            UUID userId,
            String provider,
            String providerSubjectHash,
            String supabaseIdentityId,
            String providerEmail,
            Boolean providerEmailVerified,
            OffsetDateTime usedAt
    );

    void setIdentityEmailForwarding(SocialAuthIdentityEntity identity, Boolean emailForwardingEnabled);

    void revokeIdentity(SocialAuthIdentityEntity identity, OffsetDateTime revokedAt);

    boolean createProviderEvent(
            String provider,
            String eventType,
            String providerSubjectHash,
            String providerEventIdHash,
            UUID socialAuthIdentityId
    );

    void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            String reason,
            Map<String, Object> metadata
    );

    record UserAccountRecord(
            UUID id,
            String email,
            OffsetDateTime deletedAt,
            OffsetDateTime deactivatedAt
    ) {
    }
}
