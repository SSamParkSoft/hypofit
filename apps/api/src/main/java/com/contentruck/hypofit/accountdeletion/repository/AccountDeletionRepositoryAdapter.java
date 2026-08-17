package com.contentruck.hypofit.accountdeletion.repository;

import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionPushDeviceEntity;
import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionRequestEntity;
import com.contentruck.hypofit.accountdeletion.entity.AccountDeletionUserEntity;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRepository;
import com.contentruck.hypofit.accountdeletion.service.AccountDeletionRequestReadModel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountDeletionRepositoryAdapter implements AccountDeletionRepository {

    private final AccountDeletionRequestJpaRepository requestJpaRepository;
    private final AccountDeletionUserJpaRepository userJpaRepository;
    private final AccountDeletionPushDeviceJpaRepository pushDeviceJpaRepository;
    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AccountDeletionRepositoryAdapter(
            AccountDeletionRequestJpaRepository requestJpaRepository,
            AccountDeletionUserJpaRepository userJpaRepository,
            AccountDeletionPushDeviceJpaRepository pushDeviceJpaRepository,
            NamedParameterJdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.requestJpaRepository = requestJpaRepository;
        this.userJpaRepository = userJpaRepository;
        this.pushDeviceJpaRepository = pushDeviceJpaRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<AccountDeletionRequestRecord> findRequest(UUID requestId) {
        return requestJpaRepository.findById(requestId).map(this::toRecord);
    }

    @Override
    public Optional<AccountDeletionRequestRecord> findRequestForUpdate(UUID requestId) {
        return requestJpaRepository.findForUpdateById(requestId).map(this::toRecord);
    }

    @Override
    public boolean claimVerifiedRequest(UUID requestId, OffsetDateTime updatedAt) {
        int updated = jdbcTemplate.update(
                """
                update account_deletion_requests
                set status = 'in_review', updated_at = :updatedAt
                where id = :requestId and status = 'verified'
                """,
                Map.of("requestId", requestId, "updatedAt", updatedAt)
        );
        return updated == 1;
    }

    @Override
    public Optional<AccountDeletionRequestRecord> findLatestRequestForUser(UUID userId) {
        return requestJpaRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).map(this::toRecord);
    }

    @Override
    public Optional<AccountDeletionRequestRecord> findLatestPublicRequestByEmailHash(String emailHash) {
        return requestJpaRepository.findFirstBySourceAndEmailHashOrderByCreatedAtDesc("public_web", emailHash)
                .map(this::toRecord);
    }

    @Override
    public List<AccountDeletionRequestRecord> listRequestsForAdmin(String status, int limit) {
        PageRequest pageRequest = PageRequest.of(0, limit);
        List<AccountDeletionRequestEntity> rows = status == null
                ? requestJpaRepository.findAllByOrderByUpdatedAtDesc(pageRequest)
                : requestJpaRepository.findByStatusOrderByUpdatedAtDesc(status, pageRequest);
        return rows.stream().map(this::toRecord).toList();
    }

    @Override
    public Optional<UserAccountRecord> findUserAccount(UUID userId) {
        return userJpaRepository.findById(userId).map(this::toRecord);
    }

    @Override
    public Optional<UserAccountRecord> findUserByEmail(String email) {
        return userJpaRepository.findByEmailIgnoreCase(email).map(this::toRecord);
    }

    @Override
    public AccountDeletionRequestReadModel saveRequest(AccountDeletionRequestMutation mutation) {
        AccountDeletionRequestEntity entity = mutation.id() == null
                ? null
                : requestJpaRepository.findById(mutation.id()).orElse(null);
        if (entity == null) {
            entity = new AccountDeletionRequestEntity();
            entity.setId(mutation.id() == null ? UUID.randomUUID() : mutation.id());
        }
        entity.setUserId(mutation.userId());
        entity.setEmail(mutation.email());
        entity.setEmailHash(mutation.emailHash());
        entity.setEmailRedactedAt(mutation.emailRedactedAt());
        entity.setRequesterName(mutation.requesterName());
        entity.setReason(mutation.reason());
        entity.setStatus(mutation.status());
        entity.setSource(mutation.source());
        entity.setVerificationTokenHash(mutation.verificationTokenHash());
        entity.setVerificationCodeHash(mutation.verificationCodeHash());
        entity.setVerificationExpiresAt(mutation.verificationExpiresAt());
        entity.setVerificationAttemptCount(mutation.verificationAttemptCount());
        entity.setVerificationResendAvailableAt(mutation.verificationResendAvailableAt());
        entity.setVerificationLockedAt(mutation.verificationLockedAt());
        entity.setVerificationSendCount(mutation.verificationSendCount());
        entity.setVerificationWindowStartedAt(mutation.verificationWindowStartedAt());
        entity.setDeletionAuthorizationHash(mutation.deletionAuthorizationHash());
        entity.setDeletionAuthorizationExpiresAt(mutation.deletionAuthorizationExpiresAt());
        entity.setVerifiedAt(mutation.verifiedAt());
        entity.setProcessedBy(mutation.processedBy());
        entity.setProcessedAt(mutation.processedAt());
        entity.setResult(mutation.result());
        entity.setRetentionNote(mutation.retentionNote());
        entity.setRetentionUntil(mutation.retentionUntil());
        entity.setAuthUserDeleteStatus(mutation.authUserDeleteStatus());
        entity.setAuthUserDeletedAt(mutation.authUserDeletedAt());
        entity.setAuthUserDeleteErrorCode(mutation.authUserDeleteErrorCode());
        entity.setCreatedAt(mutation.createdAt());
        entity.setUpdatedAt(mutation.updatedAt());
        return toReadModel(requestJpaRepository.saveAndFlush(entity));
    }

    @Override
    public UserAccountRecord saveUserDeletion(UserDeletionMutation mutation) {
        AccountDeletionUserEntity entity = userJpaRepository.findById(mutation.id())
                .orElseThrow(() -> new IllegalStateException("User account does not exist"));
        entity.setEmail(mutation.email());
        entity.setName(mutation.name());
        entity.setBio(mutation.bio());
        entity.setPhone(mutation.phone());
        entity.setRole(mutation.role());
        entity.setProfileImagePath(mutation.profileImagePath());
        entity.setProfileImageUrl(mutation.profileImageUrl());
        entity.setDeactivatedAt(mutation.deactivatedAt());
        entity.setDeletedAt(mutation.deletedAt());
        entity.setAnonymizedAt(mutation.anonymizedAt());
        entity.setDeletionRequestedAt(mutation.deletionRequestedAt());
        entity.setDeletionCompletedAt(mutation.deletionCompletedAt());
        entity.setDeletionReason(mutation.deletionReason());
        entity.setDeletedEmailHash(mutation.deletedEmailHash());
        return toRecord(userJpaRepository.saveAndFlush(entity));
    }

    @Override
    public int disablePushDevices(UUID userId, OffsetDateTime disabledAt, String disabledReason, OffsetDateTime updatedAt) {
        List<AccountDeletionPushDeviceEntity> devices = pushDeviceJpaRepository.findAllByUserIdAndEnabledTrue(userId);
        for (AccountDeletionPushDeviceEntity device : devices) {
            device.setEnabled(false);
            device.setDisabledAt(disabledAt);
            device.setDisabledReason(disabledReason);
            device.setUpdatedAt(updatedAt);
        }
        if (!devices.isEmpty()) {
            pushDeviceJpaRepository.saveAllAndFlush(devices);
        }
        return devices.size();
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
        jdbcTemplate.update("""
                        insert into audit_events (
                          id,
                          actor_user_id,
                          actor_type,
                          event_type,
                          target_type,
                          target_id,
                          reason,
                          metadata,
                          created_at
                        ) values (
                          :id,
                          :actorUserId,
                          :actorType,
                          :eventType,
                          :targetType,
                          :targetId,
                          :reason,
                          cast(:metadata as jsonb),
                          :createdAt
                        )
                        """, new MapSqlParameterSource()
                        .addValue("id", UUID.randomUUID())
                        .addValue("actorUserId", actorUserId)
                        .addValue("actorType", actorType)
                        .addValue("eventType", eventType)
                        .addValue("targetType", targetType)
                        .addValue("targetId", targetId)
                        .addValue("reason", reason)
                        .addValue("metadata", writeJson(metadata == null ? Map.of() : metadata))
                        .addValue("createdAt", OffsetDateTime.now()));
    }

    private AccountDeletionRequestRecord toRecord(AccountDeletionRequestEntity entity) {
        return new AccountDeletionRequestRecord(
                entity.getId(),
                entity.getUserId(),
                entity.getEmail(),
                entity.getEmailHash(),
                entity.getEmailRedactedAt(),
                entity.getRequesterName(),
                entity.getReason(),
                entity.getStatus(),
                entity.getSource(),
                entity.getVerificationTokenHash(),
                entity.getVerificationCodeHash(),
                entity.getVerificationExpiresAt(),
                entity.getVerificationAttemptCount(),
                entity.getVerificationResendAvailableAt(),
                entity.getVerificationLockedAt(),
                entity.getVerificationSendCount(),
                entity.getVerificationWindowStartedAt(),
                entity.getDeletionAuthorizationHash(),
                entity.getDeletionAuthorizationExpiresAt(),
                entity.getVerifiedAt(),
                entity.getProcessedBy(),
                entity.getProcessedAt(),
                entity.getResult(),
                entity.getRetentionNote(),
                entity.getRetentionUntil(),
                entity.getAuthUserDeleteStatus(),
                entity.getAuthUserDeletedAt(),
                entity.getAuthUserDeleteErrorCode(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private UserAccountRecord toRecord(AccountDeletionUserEntity entity) {
        return new UserAccountRecord(
                entity.getId(),
                entity.getEmail(),
                entity.getName(),
                entity.getBio(),
                entity.getPhone(),
                entity.getRole(),
                entity.getProfileImagePath(),
                entity.getProfileImageUrl(),
                entity.getDeactivatedAt(),
                entity.getDeletedAt(),
                entity.getAnonymizedAt(),
                entity.getDeletionRequestedAt(),
                entity.getDeletionCompletedAt(),
                entity.getDeletionReason(),
                entity.getDeletedEmailHash()
        );
    }

    private AccountDeletionRequestReadModel toReadModel(AccountDeletionRequestEntity entity) {
        return new AccountDeletionRequestReadModel(
                entity.getId(),
                entity.getUserId(),
                entity.getEmail(),
                entity.getEmailHash(),
                entity.getEmailRedactedAt(),
                entity.getRequesterName(),
                entity.getReason(),
                entity.getStatus(),
                entity.getSource(),
                entity.getResult(),
                entity.getRetentionNote(),
                entity.getRetentionUntil(),
                entity.getAuthUserDeleteStatus(),
                entity.getAuthUserDeletedAt(),
                entity.getAuthUserDeleteErrorCode(),
                entity.getVerifiedAt(),
                entity.getVerificationExpiresAt(),
                entity.getVerificationResendAvailableAt(),
                null,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize account deletion audit metadata JSON", exception);
        }
    }
}
