package com.contentruck.hypofit.chat.repository;

import com.contentruck.hypofit.chat.entity.ChatRoomEntity;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.chat.service.ApplicationChatLifecycleService;
import com.contentruck.hypofit.chat.service.ChatMessageRepository;
import com.contentruck.hypofit.chat.service.ChatRepository;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
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

class ChatRepositoryPostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private ApplicationChatLifecycleService lifecycleService;

    @Autowired
    private ChatRepository chatRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void concurrentRoomCreationCreatesOneRoomOneSystemMessageAndTwoSettings() throws Exception {
        Fixture fixture = seedFixture();
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Void> ensureRoom = () -> {
            ready.countDown();
            start.await();
            lifecycleService.ensureRoomForApplication(
                    fixture.applicationId(),
                    fixture.interviewPostId(),
                    fixture.founderId(),
                    fixture.respondentId()
            );
            return null;
        };

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Void> first = executor.submit(ensureRoom);
            Future<Void> second = executor.submit(ensureRoom);
            ready.await();
            start.countDown();
            first.get();
            second.get();
        }

        UUID roomId = jdbcTemplate.queryForObject(
                "select id from chat_rooms where application_id = ?",
                UUID.class,
                fixture.applicationId()
        );
        assertThat(count("select count(*) from chat_rooms where application_id = ?", fixture.applicationId()))
                .isEqualTo(1);
        assertThat(count("select count(*) from chat_messages where room_id = ?", roomId)).isEqualTo(1);
        assertThat(count("select count(*) from chat_room_participant_settings where room_id = ?", roomId))
                .isEqualTo(2);
    }

    @Test
    void concurrentDuplicateClientMessageReturnsOneCreatedMessage() throws Exception {
        Fixture fixture = seedFixture();
        lifecycleService.ensureRoomForApplication(
                fixture.applicationId(),
                fixture.interviewPostId(),
                fixture.founderId(),
                fixture.respondentId()
        );
        UUID roomId = jdbcTemplate.queryForObject(
                "select id from chat_rooms where application_id = ?",
                UUID.class,
                fixture.applicationId()
        );
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<ChatMessageRepository.CreateUserMessageResult> send = () -> {
            ready.countDown();
            start.await();
            return new TransactionTemplate(transactionManager).execute(status -> {
                ChatRoomEntity room = chatRepository.findRoomEntity(roomId).orElseThrow();
                return chatMessageRepository.createUserMessage(
                        room,
                        fixture.founderId(),
                        "동일한 메시지",
                        "client-message-1"
                );
            });
        };

        List<ChatMessageRepository.CreateUserMessageResult> outcomes;
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<ChatMessageRepository.CreateUserMessageResult> first = executor.submit(send);
            Future<ChatMessageRepository.CreateUserMessageResult> second = executor.submit(send);
            ready.await();
            start.countDown();
            outcomes = List.of(first.get(), second.get());
        }

        assertThat(outcomes).filteredOn(ChatMessageRepository.CreateUserMessageResult::created).hasSize(1);
        UUID messageId = outcomes.getFirst().message().getId();
        assertThat(outcomes).extracting(result -> result.message().getId()).containsOnly(messageId);
        assertThat(count(
                """
                select count(*) from chat_messages
                where room_id = ? and sender_id = ? and client_message_id = ?
                """,
                roomId,
                fixture.founderId(),
                "client-message-1"
        )).isEqualTo(1);
    }

    @Test
    void markRoomReadNeverMovesTheReadCursorBackward() {
        Fixture fixture = seedFixture();
        lifecycleService.ensureRoomForApplication(
                fixture.applicationId(),
                fixture.interviewPostId(),
                fixture.founderId(),
                fixture.respondentId()
        );
        UUID roomId = jdbcTemplate.queryForObject(
                "select id from chat_rooms where application_id = ?",
                UUID.class,
                fixture.applicationId()
        );
        OffsetDateTime later = OffsetDateTime.of(2026, 8, 25, 12, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime earlier = later.minusMinutes(5);

        chatMessageRepository.markRoomRead(roomId, fixture.founderId(), later);
        var result = chatMessageRepository.markRoomRead(roomId, fixture.founderId(), earlier);

        assertThat(result.getLastReadAt()).isEqualTo(later);
    }

    private Fixture seedFixture() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID interviewPostId = UUID.randomUUID();
        UUID applicationId = UUID.randomUUID();
        insertUser(founderId, "founder");
        insertUser(respondentId, "respondent");
        jdbcTemplate.update(
                """
                insert into interview_posts (
                  id, founder_id, title, service_summary, target_description,
                  reward_amount, duration_minutes, interview_mode, schedule_options, status
                ) values (?, ?, ?, ?, ?, ?, ?, ?, '[]'::jsonb, ?)
                """,
                interviewPostId,
                founderId,
                "채팅 동시성 테스트",
                "서비스 설명",
                "타깃 설명",
                15000,
                30,
                "online",
                "open"
        );
        jdbcTemplate.update(
                """
                insert into applications (
                  id, interview_post_id, respondent_id, answers, available_times, status
                ) values (?, ?, ?, '{}'::jsonb, '[]'::jsonb, 'applied')
                """,
                applicationId,
                interviewPostId,
                respondentId
        );
        return new Fixture(founderId, respondentId, interviewPostId, applicationId);
    }

    private void insertUser(UUID userId, String role) {
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                userId,
                userId + "@example.com",
                role + " user",
                role
        );
    }

    private int count(String sql, Object... arguments) {
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, arguments);
        return count == null ? 0 : count;
    }

    private record Fixture(UUID founderId, UUID respondentId, UUID interviewPostId, UUID applicationId) {
    }
}
