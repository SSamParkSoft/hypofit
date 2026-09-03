package com.contentruck.hypofit.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@TestPropertySource(properties = {
        "hypofit.push.enabled=true",
        "hypofit.push.push-apns-enabled=true"
})
class NotificationWriteServicePostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private NotificationWriteService notificationWriteService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void outerTransactionRollbackRemovesNotificationAndPushDelivery() {
        UUID userId = UUID.randomUUID();
        insertUser(userId);
        insertPushPreference(userId);
        insertPushDevice(userId);

        TransactionTemplate transactions = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> {
            notificationWriteService.createNotification(
                    userId,
                    "chat_message",
                    "새 메시지가 도착했어요",
                    "채팅을 확인해 주세요.",
                    "chat_room",
                    UUID.randomUUID(),
                    Map.of("sender_name", "세현")
            );

            assertThat(count("select count(*) from notifications where user_id = ?", userId)).isEqualTo(1);
            assertThat(count("select count(*) from push_deliveries where user_id = ?", userId)).isEqualTo(1);

            throw new IntentionalRollbackException();
        })).isInstanceOf(IntentionalRollbackException.class);

        assertThat(count("select count(*) from notifications where user_id = ?", userId)).isZero();
        assertThat(count("select count(*) from push_deliveries where user_id = ?", userId)).isZero();
    }

    private void insertUser(UUID userId) {
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, 'respondent')",
                userId,
                userId + "@example.com",
                "notification user"
        );
    }

    private void insertPushPreference(UUID userId) {
        jdbcTemplate.update(
                """
                insert into notification_preferences (user_id, push_enabled, chat_push_enabled)
                values (?, true, true)
                """,
                userId
        );
    }

    private void insertPushDevice(UUID userId) {
        jdbcTemplate.update(
                """
                insert into push_devices (
                  id, user_id, platform, provider, environment, token,
                  token_hash, permission_status, enabled
                ) values (?, ?, 'ios', 'apns', 'production', ?, ?, 'granted', true)
                """,
                UUID.randomUUID(),
                userId,
                "device-token",
                "device-token-hash"
        );
    }

    private int count(String sql, Object... arguments) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, arguments);
        return count == null ? 0 : count;
    }

    private static final class IntentionalRollbackException extends RuntimeException {
    }
}
