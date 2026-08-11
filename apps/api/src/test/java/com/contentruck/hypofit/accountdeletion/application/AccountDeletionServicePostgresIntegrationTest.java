package com.contentruck.hypofit.accountdeletion.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.accountdeletion.application.AccountDeletionAuthCleanupGateway.AuthCleanupResult;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.ConfirmCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.PublicCreateCommand;
import com.contentruck.hypofit.accountdeletion.application.AccountDeletionCommands.VerifyCommand;
import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionRequestReadModel;
import com.contentruck.hypofit.accountdeletion.domain.AccountDeletionVerificationReadModel;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.test.context.TestPropertySource;

@Import(AccountDeletionServicePostgresIntegrationTest.AccountDeletionTestConfiguration.class)
@TestPropertySource(properties = {
        "hypofit.env=test",
        "hypofit.account-deletion-hash-pepper=account-deletion-test-pepper"
})
class AccountDeletionServicePostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private AccountDeletionService service;

    @Autowired
    private TestGateways testGateways;

    @BeforeEach
    void resetGateways() {
        testGateways.reset();
    }

    @Test
    void concurrentPublicVerificationAllowsSingleSuccessfulVerification() throws Exception {
        AccountDeletionRequestReadModel created = service.createPublicRequest(
                new PublicCreateCommand("verify@example.com", "검증 사용자", "동시 검증")
        );
        String verificationCode = created.debugVerificationCode();
        assertThat(verificationCode).isNotBlank();

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Outcome<AccountDeletionVerificationReadModel>> verify = () -> {
            ready.countDown();
            start.await();
            try {
                return Outcome.success(service.verifyPublicRequest(
                        new VerifyCommand(created.id(), verificationCode, null)
                ));
            } catch (Throwable throwable) {
                return Outcome.failure(throwable);
            }
        };

        List<Outcome<AccountDeletionVerificationReadModel>> outcomes = runConcurrently(verify, verify, ready, start);

        assertThat(outcomes).filteredOn(Outcome::successful).hasSize(1);
        assertThat(outcomes)
                .filteredOn(outcome -> outcome.error() instanceof HypofitException exception && exception.getStatus() == 409)
                .hasSize(1);
        assertThat(jdbcTemplate.queryForObject(
                "select status from account_deletion_requests where id = ?",
                String.class,
                created.id()
        )).isEqualTo("verified");
        assertThat(jdbcTemplate.queryForObject(
                "select count(*) from audit_events where target_id = ? and event_type = 'account_deletion_verified'",
                Integer.class,
                created.id()
        )).isEqualTo(1);
    }

    @Test
    void concurrentPublicConfirmationCompletesDeletionOnce() throws Exception {
        UUID userId = UUID.randomUUID();
        insertUser(userId, "confirm@example.com", "founder");
        AccountDeletionRequestReadModel created = service.createPublicRequest(
                new PublicCreateCommand("confirm@example.com", "확인 사용자", "동시 확인")
        );
        String verificationCode = created.debugVerificationCode();
        assertThat(verificationCode).isNotBlank();
        AccountDeletionVerificationReadModel verified = service.verifyPublicRequest(
                new VerifyCommand(created.id(), verificationCode, null)
        );

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Outcome<AccountDeletionRequestReadModel>> confirm = () -> {
            ready.countDown();
            start.await();
            try {
                return Outcome.success(service.confirmPublicRequest(
                        new ConfirmCommand(created.id(), verified.deletionAuthorization(), true)
                ));
            } catch (Throwable throwable) {
                return Outcome.failure(throwable);
            }
        };

        List<Outcome<AccountDeletionRequestReadModel>> outcomes = runConcurrently(confirm, confirm, ready, start);

        assertThat(outcomes).filteredOn(Outcome::successful).hasSize(1);
        assertThat(outcomes)
                .filteredOn(outcome -> outcome.error() instanceof HypofitException exception && exception.getStatus() == 409)
                .hasSize(1);
        assertThat(jdbcTemplate.queryForObject(
                "select status from account_deletion_requests where id = ?",
                String.class,
                created.id()
        )).isEqualTo("completed");
        assertThat(jdbcTemplate.queryForObject(
                "select auth_user_delete_status from account_deletion_requests where id = ?",
                String.class,
                created.id()
        )).isEqualTo("deleted");
        assertThat(jdbcTemplate.queryForObject(
                "select deleted_at is not null from app_users where id = ?",
                Boolean.class,
                userId
        )).isTrue();
        assertThat(testGateways.authCleanupCalls()).isEqualTo(1);
        assertThat(testGateways.profileImagePurgeCalls()).isEqualTo(1);
    }

    private <T> List<Outcome<T>> runConcurrently(
            Callable<Outcome<T>> firstTask,
            Callable<Outcome<T>> secondTask,
            CountDownLatch ready,
            CountDownLatch start
    ) throws Exception {
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Outcome<T>> first = executor.submit(firstTask);
            Future<Outcome<T>> second = executor.submit(secondTask);
            ready.await();
            start.countDown();
            return List.of(first.get(), second.get());
        }
    }

    private void insertUser(UUID userId, String email, String role) {
        OffsetDateTime now = OffsetDateTime.now();
        jdbcTemplate.update(
                """
                insert into app_users (
                  id, email, name, role, created_at
                ) values (?, ?, ?, ?, ?)
                """,
                userId,
                email,
                "테스트 사용자",
                role,
                now
        );
    }

    private record Outcome<T>(T result, Throwable error) {

        static <T> Outcome<T> success(T result) {
            return new Outcome<>(result, null);
        }

        static <T> Outcome<T> failure(Throwable error) {
            return new Outcome<>(null, error);
        }

        boolean successful() {
            return error == null;
        }
    }

    @TestConfiguration
    static class AccountDeletionTestConfiguration {

        @Bean
        @Primary
        TestGateways testGateways() {
            return new TestGateways();
        }
    }

    static class TestGateways implements AccountDeletionEmailGateway,
            AccountDeletionAuthCleanupGateway,
            AccountDeletionProfileImagePurgeGateway {

        private final AtomicInteger authCleanupCalls = new AtomicInteger();
        private final AtomicInteger profileImagePurgeCalls = new AtomicInteger();

        void reset() {
            authCleanupCalls.set(0);
            profileImagePurgeCalls.set(0);
        }

        int authCleanupCalls() {
            return authCleanupCalls.get();
        }

        int profileImagePurgeCalls() {
            return profileImagePurgeCalls.get();
        }

        @Override
        public String sendVerificationCode(String email, String verificationCode) {
            return "verification_email_sent";
        }

        @Override
        public AuthCleanupResult deleteAuthUser(UUID userId) {
            authCleanupCalls.incrementAndGet();
            try {
                Thread.sleep(150);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while simulating auth cleanup", exception);
            }
            return new AuthCleanupResult("deleted", null);
        }

        @Override
        public String purgeProfileImage(String profileImagePath) {
            profileImagePurgeCalls.incrementAndGet();
            return "no_profile_image";
        }
    }
}
