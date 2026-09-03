package com.contentruck.hypofit.push.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.notification.service.NotificationReadModel;
import com.contentruck.hypofit.push.service.PushDispatchRepository;
import com.contentruck.hypofit.push.service.PushOutboxRepository;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

class PushOutboxPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private PushOutboxRepository outboxRepository;

    @Autowired
    private PushDispatchRepository dispatchRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void concurrentEnqueueCreatesOneDeliveryPerNotificationAndDevice() throws Exception {
        Fixture fixture = seedPushFixture(1, false);
        NotificationReadModel notification = fixture.notification();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Integer> enqueue = () -> {
            ready.countDown();
            start.await();
            return outboxRepository.enqueueDeliveries(notification, now, true, false);
        };

        List<Integer> insertedCounts;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Integer> first = executor.submit(enqueue);
            Future<Integer> second = executor.submit(enqueue);
            ready.await();
            start.countDown();
            insertedCounts = List.of(first.get(), second.get());
        }

        assertThat(insertedCounts).containsExactlyInAnyOrder(0, 1);
        assertThat(count("select count(*) from push_deliveries where notification_id = ?", notification.id()))
                .isEqualTo(1);
    }

    @Test
    void concurrentClaimsPartitionPendingDeliveriesWithoutDuplicates() throws Exception {
        Fixture fixture = seedPushFixture(4, true);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<List<PushDispatchRepository.ClaimedPushDeliveryRecord>> claim = () -> {
            ready.countDown();
            start.await();
            return new TransactionTemplate(transactionManager).execute(
                    status -> dispatchRepository.claimPendingDeliveries(now, 2)
            );
        };

        List<PushDispatchRepository.ClaimedPushDeliveryRecord> firstClaim;
        List<PushDispatchRepository.ClaimedPushDeliveryRecord> secondClaim;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<List<PushDispatchRepository.ClaimedPushDeliveryRecord>> first = executor.submit(claim);
            Future<List<PushDispatchRepository.ClaimedPushDeliveryRecord>> second = executor.submit(claim);
            ready.await();
            start.countDown();
            firstClaim = first.get();
            secondClaim = second.get();
        }

        assertThat(firstClaim).hasSize(2);
        assertThat(secondClaim).hasSize(2);
        Set<UUID> claimedIds = new HashSet<>();
        firstClaim.forEach(delivery -> claimedIds.add(delivery.deliveryId()));
        secondClaim.forEach(delivery -> claimedIds.add(delivery.deliveryId()));
        assertThat(claimedIds).hasSize(4);
        assertThat(count(
                "select count(*) from push_deliveries where notification_id = ? and status = 'sending'",
                fixture.notification().id()
        )).isEqualTo(4);
        assertThat(count(
                "select count(*) from push_deliveries where notification_id = ? and attempt_count = 1",
                fixture.notification().id()
        )).isEqualTo(4);
    }

    @Test
    void resetStaleSendingDeliveriesOnlyRequeuesRecoverableClaims() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID notificationId = UUID.randomUUID();
        UUID recoverableDeliveryId = UUID.randomUUID();
        UUID exhaustedDeliveryId = UUID.randomUUID();
        UUID recentDeliveryId = UUID.randomUUID();
        seedDeliveryFixture(notificationId);
        UUID recoverableDeviceId = insertPushDevice(notificationId, "recoverable-device");
        UUID exhaustedDeviceId = insertPushDevice(notificationId, "exhausted-device");
        UUID recentDeviceId = insertPushDevice(notificationId, "recent-device");

        insertSendingDelivery(recoverableDeliveryId, notificationId, recoverableDeviceId, now.minusSeconds(301), 1);
        insertSendingDelivery(exhaustedDeliveryId, notificationId, exhaustedDeviceId, now.minusSeconds(301), 3);
        insertSendingDelivery(recentDeliveryId, notificationId, recentDeviceId, now.minusSeconds(120), 1);

        int reset = dispatchRepository.resetStaleSendingDeliveries(now, 300, 3);
        List<PushDispatchRepository.ClaimedPushDeliveryRecord> claimed = new TransactionTemplate(transactionManager)
                .execute(status -> dispatchRepository.claimPendingDeliveries(now, 10));

        assertThat(reset).isEqualTo(1);
        assertThat(claimed)
                .isNotNull()
                .singleElement()
                .satisfies(delivery -> assertThat(delivery.deliveryId()).isEqualTo(recoverableDeliveryId));

        assertThat(selectStatus(recoverableDeliveryId)).isEqualTo("sending");
        assertThat(selectAttemptCount(recoverableDeliveryId)).isEqualTo(2);
        assertThat(selectNextAttemptAt(recoverableDeliveryId))
                .isCloseTo(now, new org.assertj.core.data.TemporalUnitWithinOffset(
                        1,
                        java.time.temporal.ChronoUnit.MICROS
                ));

        assertThat(selectStatus(exhaustedDeliveryId)).isEqualTo("sending");
        assertThat(selectAttemptCount(exhaustedDeliveryId)).isEqualTo(3);

        assertThat(selectStatus(recentDeliveryId)).isEqualTo("sending");
        assertThat(selectAttemptCount(recentDeliveryId)).isEqualTo(1);
    }

    @Test
    void snapshotPendingDeliveriesCountsOnlyDispatchableEnabledRows() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        UUID notificationId = UUID.randomUUID();
        seedDeliveryFixture(notificationId);
        UUID eligibleDeviceId = insertPushDevice(notificationId, "eligible-device");
        UUID disabledDeviceId = insertPushDevice(notificationId, "disabled-device");
        jdbcTemplate.update("update push_devices set enabled = false where id = ?", disabledDeviceId);

        insertPendingDelivery(UUID.randomUUID(), notificationId, eligibleDeviceId, now.minusSeconds(90));
        insertPendingDelivery(UUID.randomUUID(), notificationId, disabledDeviceId, now.minusSeconds(300));

        PushDispatchRepository.PushOutboxSnapshot snapshot = dispatchRepository.snapshotPendingDeliveries(now);

        assertThat(snapshot.pendingCount()).isEqualTo(1);
        assertThat(snapshot.oldestPendingAgeSeconds()).isBetween(89L, 91L);
    }

    private Fixture seedPushFixture(int deviceCount, boolean seedDeliveries) {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, 'respondent')",
                userId,
                userId + "@example.com",
                "push user"
        );
        jdbcTemplate.update(
                """
                insert into notification_preferences (user_id, push_enabled, chat_push_enabled)
                values (?, true, true)
                """,
                userId
        );
        jdbcTemplate.update(
                """
                insert into notifications (
                  id, user_id, type, title, body, target_type, metadata, created_at
                ) values (?, ?, 'chat_message', '새 메시지', '메시지를 확인해 주세요',
                          'chat_room', '{}'::jsonb, ?)
                """,
                notificationId,
                userId,
                createdAt
        );
        for (int index = 0; index < deviceCount; index += 1) {
            UUID deviceId = UUID.randomUUID();
            jdbcTemplate.update(
                    """
                    insert into push_devices (
                      id, user_id, platform, provider, environment, token,
                      token_hash, permission_status, enabled
                    ) values (?, ?, 'ios', 'apns', 'production', ?, ?, 'granted', true)
                    """,
                    deviceId,
                    userId,
                    "device-token-" + index,
                    "device-token-hash-" + index
            );
            if (seedDeliveries) {
                jdbcTemplate.update(
                        """
                        insert into push_deliveries (
                          id, notification_id, push_device_id, user_id, provider,
                          status, attempt_count, next_attempt_at, created_at, updated_at
                        ) values (?, ?, ?, ?, 'apns', 'pending', 0, ?, ?, ?)
                        """,
                        UUID.randomUUID(),
                        notificationId,
                        deviceId,
                        userId,
                        createdAt,
                        createdAt,
                        createdAt
                );
            }
        }
        return new Fixture(new NotificationReadModel(
                notificationId,
                userId,
                "chat_message",
                "새 메시지",
                "메시지를 확인해 주세요",
                "chat_room",
                null,
                Map.of(),
                null,
                createdAt
        ));
    }

    private void seedDeliveryFixture(UUID notificationId) {
        UUID userId = UUID.randomUUID();
        OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, 'respondent')",
                userId,
                userId + "@example.com",
                "push user"
        );
        jdbcTemplate.update(
                """
                insert into notification_preferences (user_id, push_enabled, chat_push_enabled)
                values (?, true, true)
                """,
                userId
        );
        jdbcTemplate.update(
                """
                insert into notifications (
                  id, user_id, type, title, body, target_type, metadata, created_at
                ) values (?, ?, 'chat_message', '새 메시지', '메시지를 확인해 주세요',
                          'chat_room', '{}'::jsonb, ?)
                """,
                notificationId,
                userId,
                createdAt
        );
    }

    private UUID insertPushDevice(UUID notificationId, String tokenSuffix) {
        UUID userId = jdbcTemplate.queryForObject(
                "select user_id from notifications where id = ?",
                UUID.class,
                notificationId
        );
        UUID deviceId = UUID.randomUUID();
        jdbcTemplate.update(
                """
                insert into push_devices (
                  id, user_id, platform, provider, environment, token,
                  token_hash, permission_status, enabled
                ) values (?, ?, 'ios', 'apns', 'production', ?, ?, 'granted', true)
                """,
                deviceId,
                userId,
                tokenSuffix,
                tokenSuffix + "-hash"
        );
        return deviceId;
    }

    private void insertSendingDelivery(
            UUID deliveryId,
            UUID notificationId,
            UUID deviceId,
            OffsetDateTime updatedAt,
            int attemptCount
    ) {
        UUID userId = jdbcTemplate.queryForObject(
                "select user_id from notifications where id = ?",
                UUID.class,
                notificationId
        );
        jdbcTemplate.update(
                """
                insert into push_deliveries (
                  id, notification_id, push_device_id, user_id, provider,
                  status, attempt_count, next_attempt_at, created_at, updated_at
                ) values (?, ?, ?, ?, 'apns', 'sending', ?, ?, ?, ?)
                """,
                deliveryId,
                notificationId,
                deviceId,
                userId,
                attemptCount,
                updatedAt.minusMinutes(5),
                updatedAt.minusMinutes(5),
                updatedAt
        );
    }

    private void insertPendingDelivery(
            UUID deliveryId,
            UUID notificationId,
            UUID deviceId,
            OffsetDateTime createdAt
    ) {
        UUID userId = jdbcTemplate.queryForObject(
                "select user_id from notifications where id = ?",
                UUID.class,
                notificationId
        );
        jdbcTemplate.update(
                """
                insert into push_deliveries (
                  id, notification_id, push_device_id, user_id, provider,
                  status, attempt_count, next_attempt_at, created_at, updated_at
                ) values (?, ?, ?, ?, 'apns', 'pending', 0, ?, ?, ?)
                """,
                deliveryId,
                notificationId,
                deviceId,
                userId,
                createdAt,
                createdAt,
                createdAt
        );
    }

    private int count(String sql, Object... arguments) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, arguments);
        return count == null ? 0 : count;
    }

    private String selectStatus(UUID deliveryId) {
        return jdbcTemplate.queryForObject(
                "select status from push_deliveries where id = ?",
                String.class,
                deliveryId
        );
    }

    private int selectAttemptCount(UUID deliveryId) {
        Integer attemptCount = jdbcTemplate.queryForObject(
                "select attempt_count from push_deliveries where id = ?",
                Integer.class,
                deliveryId
        );
        return attemptCount == null ? 0 : attemptCount;
    }

    private OffsetDateTime selectNextAttemptAt(UUID deliveryId) {
        return jdbcTemplate.queryForObject(
                "select next_attempt_at from push_deliveries where id = ?",
                OffsetDateTime.class,
                deliveryId
        );
    }

    private record Fixture(NotificationReadModel notification) {
    }
}
