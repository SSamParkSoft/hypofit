package com.contentruck.hypofit.socialauth.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.socialauth.domain.SocialAuthReadModels;
import com.contentruck.hypofit.testsupport.PostgresIntegrationTestSupport;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@TestPropertySource(properties = {
        "hypofit.social-auth-enabled=true",
        "hypofit.social-auth-attempt-pepper=attempt-pepper",
        "hypofit.social-auth-identity-pepper=identity-pepper",
        "hypofit.social-auth-google-state=available"
})
class SocialAuthServicePostgresIntegrationTest extends PostgresIntegrationTestSupport {

    @Autowired
    private SocialAuthService socialAuthService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private SocialAuthAdminClient authAdminClient;

    @Test
    void concurrentSameUserIdentityCompletionKeepsSingleIdentityRow() throws Exception {
        UUID userId = UUID.randomUUID();
        String email = "founder@example.com";
        insertUser(userId, email, "founder");
        AttemptFixture firstAttempt = insertAttempt(userId);
        AttemptFixture secondAttempt = insertAttempt(userId);
        stubAdminIdentity(userId, "stable-google-subject", "google-identity-id", email);

        List<Object> outcomes = runConcurrently(
                completeAttempt(userId, firstAttempt),
                completeAttempt(userId, secondAttempt)
        );

        assertThat(outcomes).allSatisfy(outcome -> {
            assertThat(outcome).isInstanceOf(SocialAuthReadModels.CompleteReadModel.class);
            SocialAuthReadModels.CompleteReadModel completed = (SocialAuthReadModels.CompleteReadModel) outcome;
            assertThat(completed.nextStep()).isEqualTo("signed_in");
            assertThat(completed.identity().provider()).isEqualTo("google");
        });

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from social_auth_identities where user_id = ? and provider = 'google'",
                Integer.class,
                userId
        );
        assertThat(count).isEqualTo(1);
    }

    @Test
    void concurrentCrossUserIdentityCompletionReturnsConflictInsteadOfRawFailure() throws Exception {
        UUID firstUserId = UUID.randomUUID();
        UUID secondUserId = UUID.randomUUID();
        insertUser(firstUserId, "first@example.com", "founder");
        insertUser(secondUserId, "second@example.com", "founder");
        AttemptFixture firstAttempt = insertAttempt(firstUserId);
        AttemptFixture secondAttempt = insertAttempt(secondUserId);
        stubAdminIdentity(firstUserId, "shared-google-subject", "shared-google-identity-id", "shared@example.com");
        stubAdminIdentity(secondUserId, "shared-google-subject", "shared-google-identity-id", "shared@example.com");

        List<Object> outcomes = runConcurrently(
                completeAttempt(firstUserId, firstAttempt),
                completeAttempt(secondUserId, secondAttempt)
        );

        assertThat(outcomes).filteredOn(SocialAuthReadModels.CompleteReadModel.class::isInstance).hasSize(1);
        assertThat(outcomes).filteredOn(HypofitException.class::isInstance).hasSize(1);
        HypofitException conflict = (HypofitException) outcomes.stream()
                .filter(HypofitException.class::isInstance)
                .findFirst()
                .orElseThrow();
        assertThat(conflict.getCode()).isEqualTo("social_identity_conflict");

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from social_auth_identities where provider = 'google' and provider_subject_hash = ?",
                Integer.class,
                hmac("shared-google-subject", "identity-pepper")
        );
        assertThat(count).isEqualTo(1);
    }

    private List<Object> runConcurrently(Callable<Object> firstTask, Callable<Object> secondTask) throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        Callable<Object> first = wrapWithBarrier(ready, start, firstTask);
        Callable<Object> second = wrapWithBarrier(ready, start, secondTask);

        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Object> firstFuture = executor.submit(first);
            Future<Object> secondFuture = executor.submit(second);
            ready.await();
            start.countDown();
            return List.of(firstFuture.get(), secondFuture.get());
        }
    }

    private Callable<Object> wrapWithBarrier(
            CountDownLatch ready,
            CountDownLatch start,
            Callable<Object> task
    ) {
        return () -> {
            ready.countDown();
            start.await();
            try {
                return task.call();
            } catch (Throwable throwable) {
                return throwable;
            }
        };
    }

    private Callable<Object> completeAttempt(UUID userId, AttemptFixture attempt) {
        return () -> new TransactionTemplate(transactionManager)
                .execute(status -> socialAuthService.completeAttempt(userId, attempt.id(), attempt.secret()));
    }

    private void stubAdminIdentity(
            UUID userId,
            String subject,
            String identityId,
            String email
    ) {
        when(authAdminClient.getAuthUser(userId)).thenReturn(new SocialAuthAdminClient.SocialAuthAdminUser(List.of(
                new SocialAuthReadModels.VerifiedProviderIdentity(
                        "google",
                        subject,
                        identityId,
                        email,
                        Boolean.TRUE
                )
        )));
    }

    private void insertUser(UUID userId, String email, String role) {
        jdbcTemplate.update(
                "insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                userId,
                email,
                role + " user",
                role
        );
    }

    private AttemptFixture insertAttempt(UUID userId) {
        UUID attemptId = UUID.randomUUID();
        String secret = "secret-" + attemptId;
        jdbcTemplate.update(
                """
                insert into social_auth_attempts (
                  id, provider, platform, flow, return_path, secret_hash,
                  status, auth_user_id, expires_at, created_at
                ) values (?, 'google', 'web', 'login', '/app', ?, 'pending', ?, ?, ?)
                """,
                attemptId,
                hmac(secret, "attempt-pepper"),
                userId,
                OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(5),
                OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1)
        );
        return new AttemptFixture(attemptId, secret);
    }

    private static String hmac(String value, String pepper) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(pepper.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item));
            }
            return builder.toString();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private record AttemptFixture(UUID id, String secret) {
    }
}
