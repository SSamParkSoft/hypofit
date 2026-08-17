package com.contentruck.hypofit.push.repository;

import com.contentruck.hypofit.push.entity.NotificationPreferenceEntity;
import com.contentruck.hypofit.push.entity.PushDeviceEntity;
import com.contentruck.hypofit.push.service.PushRepository;
import com.contentruck.hypofit.push.service.NotificationPreferenceReadModel;
import com.contentruck.hypofit.push.service.PushDeviceReadModel;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class PushRepositoryAdapter implements PushRepository {

    private final PushUserJpaRepository pushUserJpaRepository;
    private final PushDeviceJpaRepository pushDeviceJpaRepository;
    private final NotificationPreferenceJpaRepository notificationPreferenceJpaRepository;

    public PushRepositoryAdapter(
            PushUserJpaRepository pushUserJpaRepository,
            PushDeviceJpaRepository pushDeviceJpaRepository,
            NotificationPreferenceJpaRepository notificationPreferenceJpaRepository
    ) {
        this.pushUserJpaRepository = pushUserJpaRepository;
        this.pushDeviceJpaRepository = pushDeviceJpaRepository;
        this.notificationPreferenceJpaRepository = notificationPreferenceJpaRepository;
    }

    @Override
    public Optional<UserAccountRecord> findUserAccount(UUID userId) {
        return pushUserJpaRepository.findById(userId)
                .map(entity -> new UserAccountRecord(entity.getId(), entity.getDeactivatedAt(), entity.getDeletedAt()));
    }

    @Override
    public Optional<PushDeviceRecord> findPushDevice(String provider, String environment, String tokenHash) {
        return pushDeviceJpaRepository.findByProviderAndEnvironmentAndTokenHash(provider, environment, tokenHash)
                .map(this::toRecord);
    }

    @Override
    public Optional<PushDeviceRecord> findUserPushDevice(UUID pushDeviceId, UUID userId) {
        return pushDeviceJpaRepository.findByIdAndUserId(pushDeviceId, userId).map(this::toRecord);
    }

    @Override
    public PushDeviceReadModel savePushDevice(PushDeviceMutation mutation) {
        PushDeviceEntity entity = mutation.id() == null
                ? null
                : pushDeviceJpaRepository.findById(mutation.id()).orElse(null);
        if (entity == null) {
            entity = new PushDeviceEntity();
            entity.setId(mutation.id() == null ? UUID.randomUUID() : mutation.id());
        }
        entity.setUserId(mutation.userId());
        entity.setPlatform(mutation.platform());
        entity.setProvider(mutation.provider());
        entity.setEnvironment(mutation.environment());
        entity.setToken(mutation.token());
        entity.setTokenHash(mutation.tokenHash());
        entity.setInstallationId(mutation.installationId());
        entity.setDeviceLabel(mutation.deviceLabel());
        entity.setAppVersion(mutation.appVersion());
        entity.setBuildNumber(mutation.buildNumber());
        entity.setOsVersion(mutation.osVersion());
        entity.setLocale(mutation.locale());
        entity.setTimezone(mutation.timezone());
        entity.setPermissionStatus(mutation.permissionStatus());
        entity.setEnabled(mutation.enabled());
        entity.setLastRegisteredAt(mutation.lastRegisteredAt());
        entity.setLastSuccessAt(mutation.lastSuccessAt());
        entity.setLastFailureAt(mutation.lastFailureAt());
        entity.setFailureCount(mutation.failureCount());
        entity.setDisabledAt(mutation.disabledAt());
        entity.setDisabledReason(mutation.disabledReason());
        entity.setCreatedAt(mutation.createdAt());
        entity.setUpdatedAt(mutation.updatedAt());
        return toReadModel(pushDeviceJpaRepository.saveAndFlush(entity));
    }

    @Override
    public NotificationPreferenceRecord getOrCreatePreferences(UUID userId, OffsetDateTime now) {
        NotificationPreferenceEntity entity = notificationPreferenceJpaRepository.findById(userId).orElse(null);
        if (entity == null) {
            entity = new NotificationPreferenceEntity();
            entity.setUserId(userId);
            entity.setPushEnabled(false);
            entity.setChatPushEnabled(true);
            entity.setApplicationPushEnabled(true);
            entity.setSessionPushEnabled(true);
            entity.setSupportPushEnabled(true);
            entity.setMarketingPushEnabled(false);
            entity.setCreatedAt(now);
            entity.setUpdatedAt(now);
            entity = notificationPreferenceJpaRepository.saveAndFlush(entity);
        }
        return toRecord(entity);
    }

    @Override
    public NotificationPreferenceReadModel savePreferences(NotificationPreferenceMutation mutation) {
        NotificationPreferenceEntity entity = notificationPreferenceJpaRepository.findById(mutation.userId())
                .orElseGet(NotificationPreferenceEntity::new);
        entity.setUserId(mutation.userId());
        entity.setPushEnabled(mutation.pushEnabled());
        entity.setChatPushEnabled(mutation.chatPushEnabled());
        entity.setApplicationPushEnabled(mutation.applicationPushEnabled());
        entity.setSessionPushEnabled(mutation.sessionPushEnabled());
        entity.setSupportPushEnabled(mutation.supportPushEnabled());
        entity.setMarketingPushEnabled(mutation.marketingPushEnabled());
        entity.setCreatedAt(mutation.createdAt());
        entity.setUpdatedAt(mutation.updatedAt());
        return toReadModel(notificationPreferenceJpaRepository.saveAndFlush(entity));
    }

    private PushDeviceRecord toRecord(PushDeviceEntity entity) {
        return new PushDeviceRecord(
                entity.getId(),
                entity.getUserId(),
                entity.getPlatform(),
                entity.getProvider(),
                entity.getEnvironment(),
                entity.getToken(),
                entity.getTokenHash(),
                entity.getInstallationId(),
                entity.getDeviceLabel(),
                entity.getAppVersion(),
                entity.getBuildNumber(),
                entity.getOsVersion(),
                entity.getLocale(),
                entity.getTimezone(),
                entity.getPermissionStatus(),
                entity.isEnabled(),
                entity.getLastRegisteredAt(),
                entity.getLastSuccessAt(),
                entity.getLastFailureAt(),
                entity.getFailureCount(),
                entity.getDisabledAt(),
                entity.getDisabledReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private PushDeviceReadModel toReadModel(PushDeviceEntity entity) {
        return new PushDeviceReadModel(
                entity.getId(),
                entity.getPlatform(),
                entity.getProvider(),
                entity.getEnvironment(),
                entity.getInstallationId(),
                entity.getDeviceLabel(),
                entity.getAppVersion(),
                entity.getBuildNumber(),
                entity.getOsVersion(),
                entity.getLocale(),
                entity.getTimezone(),
                entity.getPermissionStatus(),
                entity.isEnabled(),
                entity.getLastRegisteredAt(),
                entity.getLastSuccessAt(),
                entity.getLastFailureAt(),
                entity.getDisabledAt(),
                entity.getDisabledReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private NotificationPreferenceRecord toRecord(NotificationPreferenceEntity entity) {
        return new NotificationPreferenceRecord(
                entity.getUserId(),
                entity.isPushEnabled(),
                entity.isChatPushEnabled(),
                entity.isApplicationPushEnabled(),
                entity.isSessionPushEnabled(),
                entity.isSupportPushEnabled(),
                entity.isMarketingPushEnabled(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private NotificationPreferenceReadModel toReadModel(NotificationPreferenceEntity entity) {
        return new NotificationPreferenceReadModel(
                entity.getUserId(),
                entity.isPushEnabled(),
                entity.isChatPushEnabled(),
                entity.isApplicationPushEnabled(),
                entity.isSessionPushEnabled(),
                entity.isSupportPushEnabled(),
                entity.isMarketingPushEnabled(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
