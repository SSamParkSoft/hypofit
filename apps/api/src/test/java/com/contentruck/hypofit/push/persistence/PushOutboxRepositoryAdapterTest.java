package com.contentruck.hypofit.push.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.notification.domain.NotificationReadModel;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

@ExtendWith(MockitoExtension.class)
class PushOutboxRepositoryAdapterTest {

    @Mock
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void enqueueDeliveriesUsesIdempotentInsertWithProviderAndPreferenceGating() {
        NotificationReadModel notification = new NotificationReadModel(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "chat_message",
                "새 메시지가 도착했어요",
                "채팅을 확인해 보세요.",
                "chat_room",
                UUID.randomUUID(),
                Map.of("room_id", "room-1"),
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        when(jdbcTemplate.update(anyString(), any(MapSqlParameterSource.class))).thenReturn(2);

        PushOutboxRepositoryAdapter adapter = new PushOutboxRepositoryAdapter(jdbcTemplate);

        int inserted = adapter.enqueueDeliveries(notification, now, true, false);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<MapSqlParameterSource> paramsCaptor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(jdbcTemplate).update(sqlCaptor.capture(), paramsCaptor.capture());

        String sql = sqlCaptor.getValue().replaceAll("\\s+", " ").trim();
        MapSqlParameterSource params = paramsCaptor.getValue();

        assertThat(inserted).isEqualTo(2);
        assertThat(sql).contains("insert into push_deliveries");
        assertThat(sql).contains("on conflict (notification_id, push_device_id) do nothing");
        assertThat(sql).contains("(d.provider = 'apns' and :apnsEnabled = true)");
        assertThat(sql).contains("(d.provider = 'fcm' and :fcmEnabled = true)");
        assertThat(sql).contains("coalesce(p.push_enabled, false) = true");
        assertThat(sql).contains("then coalesce(p.chat_push_enabled, true)");
        assertThat(params.getValue("notificationId")).isEqualTo(notification.id());
        assertThat(params.getValue("userId")).isEqualTo(notification.userId());
        assertThat(params.getValue("notificationType")).isEqualTo("chat_message");
        assertThat(params.getValue("now")).isEqualTo(now);
        assertThat(params.getValue("apnsEnabled")).isEqualTo(true);
        assertThat(params.getValue("fcmEnabled")).isEqualTo(false);
    }
}
