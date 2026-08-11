package com.contentruck.hypofit.push.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PushRepositoryAdapterTest {

    @Mock
    private PushUserJpaRepository pushUserJpaRepository;

    @Mock
    private PushDeviceJpaRepository pushDeviceJpaRepository;

    @Mock
    private NotificationPreferenceJpaRepository notificationPreferenceJpaRepository;

    @Test
    void getOrCreatePreferencesCreatesDefaultRowWhenMissing() {
        UUID userId = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        NotificationPreferenceEntity created = new NotificationPreferenceEntity();
        created.setUserId(userId);
        created.setPushEnabled(false);
        created.setChatPushEnabled(true);
        created.setApplicationPushEnabled(true);
        created.setSessionPushEnabled(true);
        created.setSupportPushEnabled(true);
        created.setMarketingPushEnabled(false);
        created.setCreatedAt(now);
        created.setUpdatedAt(now);

        when(notificationPreferenceJpaRepository.findById(userId)).thenReturn(Optional.empty());
        when(notificationPreferenceJpaRepository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenReturn(created);

        PushRepositoryAdapter adapter = new PushRepositoryAdapter(
                pushUserJpaRepository,
                pushDeviceJpaRepository,
                notificationPreferenceJpaRepository
        );

        var record = adapter.getOrCreatePreferences(userId, now);

        assertThat(record.userId()).isEqualTo(userId);
        assertThat(record.pushEnabled()).isFalse();
        assertThat(record.chatPushEnabled()).isTrue();
    }
}
