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

    private int count(String sql, Object... arguments) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, arguments);
        return count == null ? 0 : count;
    }

    private record Fixture(NotificationReadModel notification) {
    }
}
