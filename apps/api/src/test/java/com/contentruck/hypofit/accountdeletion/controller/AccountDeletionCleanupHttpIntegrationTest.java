package com.contentruck.hypofit.accountdeletion.controller;

import com.contentruck.hypofit.accountdeletion.service.AccountDeletionCleanupRetryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.flyway.enabled=true",
        "hypofit.env=test",
        "hypofit.resend-api-key=",
        "hypofit.resend-from-email=",
        "hypofit.supabase-service-role-key=sb_secret_local_fixture_only",
        "hypofit.account-deletion-hash-pepper=local-deletion-http-fixture-pepper",
        "hypofit.account-deletion.cleanup-retry-enabled=true",
        "hypofit.push.push-worker-enabled=false",
        "hypofit.ai-summary-worker-enabled=false"
})
@ActiveProfiles("test")
@Testcontainers
class AccountDeletionCleanupHttpIntegrationTest {
    private static final RSAKey SIGNING_KEY = signingKey();
    private static final AtomicInteger AUTH_STATUS = new AtomicInteger(200);
    private static final AtomicInteger STORAGE_STATUS = new AtomicInteger(200);
    private static final AtomicInteger AUTH_CALLS = new AtomicInteger();
    private static final AtomicInteger STORAGE_CALLS = new AtomicInteger();
    // Only the provider boundary is simulated; the HTTP/security/service/database path is real.
    private static final HttpServer PROVIDER = providerServer();
    private static final ObjectMapper JSON = new ObjectMapper();

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres"));

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private AccountDeletionCleanupRetryService retryService;

    @Value("${local.server.port}")
    private int port;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        try (var connection = java.sql.DriverManager.getConnection(
                POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("drop extension if exists postgis cascade");
        } catch (java.sql.SQLException exception) {
            throw new IllegalStateException("Could not prepare the isolated PostGIS fixture", exception);
        }
        registry.add("hypofit.database-url", () -> "postgresql://%s:%s@%s:%d/%s".formatted(
                POSTGRES.getUsername(), POSTGRES.getPassword(), POSTGRES.getHost(),
                POSTGRES.getMappedPort(5432), POSTGRES.getDatabaseName()));
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access", () -> true);
        registry.add("hypofit.supabase-url", AccountDeletionCleanupHttpIntegrationTest::providerUrl);
        registry.add("hypofit.supabase-jwks-url", () -> providerUrl() + "/auth/v1/.well-known/jwks.json");
        registry.add("hypofit.supabase-jwt-issuer", () -> providerUrl() + "/auth/v1");
    }

    @BeforeEach
    void clearFixture() {
        jdbc.execute("truncate table app_users, audit_events cascade");
        AUTH_STATUS.set(200);
        STORAGE_STATUS.set(200);
        AUTH_CALLS.set(0);
        STORAGE_CALLS.set(0);
    }

    @AfterAll
    static void closeProvider() {
        PROVIDER.stop(0);
    }

    @Test
    void verifiedConfirmationAloneClearsOrganizationImageAndAllDeviceIdentifiers() throws Exception {
        UUID actor = seedUser();
        UUID other = seedUser();
        assertThat(post(null, "/me", "{}").statusCode()).isEqualTo(401);
        JsonNode created = accepted(post(actor, "/me", "{}"), 201);
        assertOrganizationUnchanged(actor);
        assertThat(AUTH_CALLS.get()).isZero();
        assertThat(STORAGE_CALLS.get()).isZero();
        UUID requestId = UUID.fromString(created.path("id").asText());
        String verifyBody = "{\"request_id\":\"%s\",\"code\":\"%s\"}"
                .formatted(requestId, created.path("debug_verification_code").asText());
        assertThat(post(other, "/me/verify", verifyBody).statusCode()).isEqualTo(404);
        JsonNode verified = accepted(post(actor, "/me/verify", verifyBody), 200);
        assertOrganizationUnchanged(actor);
        assertThat(jdbc.queryForObject("select deleted_at from app_users where id=?", java.sql.Timestamp.class, actor)).isNull();
        String confirmBody = confirmation(requestId, verified.path("deletion_authorization").asText());
        assertThat(post(other, "/me/confirm", confirmBody).statusCode()).isEqualTo(404);
        JsonNode completed = accepted(post(actor, "/me/confirm", confirmBody), 200);
        assertThat(completed.path("status").asText()).isEqualTo("completed");
        assertThat(completed.path("auth_user_delete_status").asText()).isEqualTo("deleted");
        assertDeletedProfile(actor);
        assertThat(jdbc.queryForObject("select pending_profile_image_path from account_deletion_requests where id=?",
                String.class, requestId)).isNull();
        assertThat(AUTH_CALLS.get()).isEqualTo(1);
        assertThat(STORAGE_CALLS.get()).isEqualTo(1);
        assertThat(post(actor, "/me/confirm", confirmBody).statusCode()).isEqualTo(409);
        retryService.retryCleanup();
        assertThat(AUTH_CALLS.get()).isEqualTo(1);
        assertThat(STORAGE_CALLS.get()).isEqualTo(1);
        assertOrganizationUnchanged(other);
    }

    @Test
    void publicRequestAndCodeVerificationPreserveProfileUntilExplicitConfirmation() throws Exception {
        UUID actor = seedUser();
        JsonNode created = accepted(post(null, "/public", "{\"email\":\"" + actor + "@example.invalid\"}"), 201);
        UUID requestId = UUID.fromString(created.path("id").asText());
        assertOrganizationUnchanged(actor);
        JsonNode verified = accepted(post(null, "/public/verify", "{\"request_id\":\"%s\",\"code\":\"%s\"}"
                .formatted(requestId, created.path("debug_verification_code").asText())), 200);
        assertOrganizationUnchanged(actor);
        assertThat(AUTH_CALLS.get()).isZero();
        assertThat(STORAGE_CALLS.get()).isZero();
        accepted(post(null, "/public/confirm", confirmation(requestId, verified.path("deletion_authorization").asText())), 200);
        assertDeletedProfile(actor);
        assertThat(jdbc.queryForObject("select auth_user_delete_status from account_deletion_requests where id=?",
                String.class, requestId)).isEqualTo("deleted");
        assertThat(AUTH_CALLS.get()).isEqualTo(1);
        assertThat(STORAGE_CALLS.get()).isEqualTo(1);
    }

    @Test
    void deviceRegistrationInFlightCannotRestoreIdentifiersAfterDeletion() throws Exception {
        UUID actor = seedUser();
        JsonNode created = accepted(post(actor, "/me", "{}"), 201);
        UUID requestId = UUID.fromString(created.path("id").asText());
        JsonNode verified = accepted(post(actor, "/me/verify", "{\"request_id\":\"%s\",\"code\":\"%s\"}"
                .formatted(requestId, created.path("debug_verification_code").asText())), 200);
        String confirmBody = confirmation(requestId, verified.path("deletion_authorization").asText());
        String registerBody = """
                {"platform":"ios","provider":"apns","environment":"development",
                 "token":"fixture-racing-token","installation_id":"racing-installation","permission_status":"granted"}
                """;
        jdbc.execute("""
                create function fixture_registration_barrier() returns trigger language plpgsql as $$
                begin
                  if new.token='fixture-racing-token' then perform pg_advisory_xact_lock(184401); end if;
                  return new;
                end $$
                """);
        jdbc.execute("create trigger fixture_registration_wait before insert on push_devices for each row execute function fixture_registration_barrier()");
        try (var executor = Executors.newFixedThreadPool(2);
                var barrier = java.sql.DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = barrier.createStatement()) {
            statement.execute("select pg_advisory_lock(184401)");
            var registration = executor.submit(() -> postApi(actor, "/api/v1/push-devices", registerBody));
            awaitDatabaseWait("push_devices", "advisory");
            var completion = executor.submit(() -> post(actor, "/me/confirm", confirmBody));
            awaitDatabaseWait("app_users", "transactionid");
            assertThat(completion.isDone()).isFalse();
            statement.execute("select pg_advisory_unlock(184401)");
            accepted(registration.get(15, TimeUnit.SECONDS), 200);
            accepted(completion.get(15, TimeUnit.SECONDS), 200);
        } finally {
            jdbc.execute("drop trigger fixture_registration_wait on push_devices");
            jdbc.execute("drop function fixture_registration_barrier()");
        }
        assertDeletedProfile(actor, 3);
        assertThat(postApi(actor, "/api/v1/push-devices", registerBody).statusCode()).isEqualTo(403);
        assertDeletedProfile(actor, 3);
    }

    @Test
    void resendWaitingForCompletionCannotResetCompletedState() throws Exception {
        UUID actor = seedUser();
        AUTH_STATUS.set(503);
        STORAGE_STATUS.set(500);
        JsonNode created = accepted(post(null, "/public", "{\"email\":\"" + actor + "@example.invalid\"}"), 201);
        UUID requestId = UUID.fromString(created.path("id").asText());
        JsonNode verified = accepted(post(null, "/public/verify", "{\"request_id\":\"%s\",\"code\":\"%s\"}"
                .formatted(requestId, created.path("debug_verification_code").asText())), 200);
        jdbc.update("update account_deletion_requests set verification_resend_available_at=now()-interval '1 minute' where id=?", requestId);
        String confirmBody = confirmation(requestId, verified.path("deletion_authorization").asText());
        jdbc.execute("""
                create function fixture_completion_barrier() returns trigger language plpgsql as $$
                begin
                  if new.status='completed' and old.status='in_review' then perform pg_advisory_xact_lock(184402); end if;
                  return new;
                end $$
                """);
        jdbc.execute("create trigger fixture_completion_wait before update on account_deletion_requests for each row execute function fixture_completion_barrier()");
        try (var executor = Executors.newFixedThreadPool(2);
                var barrier = java.sql.DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                var statement = barrier.createStatement()) {
            statement.execute("select pg_advisory_lock(184402)");
            var completion = executor.submit(() -> post(null, "/public/confirm", confirmBody));
            awaitDatabaseWait("account_deletion_requests", "advisory");
            var resend = executor.submit(() -> post(null, "/public/resend", "{\"request_id\":\"" + requestId + "\"}"));
            awaitDatabaseWait("account_deletion_requests", "transactionid");
            statement.execute("select pg_advisory_unlock(184402)");
            accepted(completion.get(15, TimeUnit.SECONDS), 200);
            assertThat(resend.get(15, TimeUnit.SECONDS).statusCode()).isEqualTo(409);
        } finally {
            jdbc.execute("drop trigger fixture_completion_wait on account_deletion_requests");
            jdbc.execute("drop function fixture_completion_barrier()");
        }
        var result = jdbc.queryForMap("select status,pending_profile_image_path,auth_user_delete_status from account_deletion_requests where id=?", requestId);
        assertThat(result.get("status")).isEqualTo("completed");
        assertThat(result.get("pending_profile_image_path")).isEqualTo(actor + "/avatar.jpg");
        assertThat(result.get("auth_user_delete_status")).isEqualTo("failed_retryable");
        jdbc.update("update account_deletion_requests set updated_at=now()-interval '16 minutes' where id=?", requestId);
        AUTH_STATUS.set(200);
        STORAGE_STATUS.set(200);
        retryService.retryCleanup();
        assertThat(jdbc.queryForObject("select pending_profile_image_path from account_deletion_requests where id=?", String.class, requestId)).isNull();
        assertThat(jdbc.queryForObject("select auth_user_delete_status from account_deletion_requests where id=?", String.class, requestId)).isEqualTo("deleted");
    }

    private void awaitDatabaseWait(String queryFragment, String waitEvent) throws InterruptedException {
        long deadline = System.nanoTime() + Duration.ofSeconds(8).toNanos();
        while (System.nanoTime() < deadline) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("""
                    select exists(select 1 from pg_stat_activity where datname=current_database()
                      and pid<>pg_backend_pid() and wait_event_type='Lock' and wait_event=? and query like ?)
                    """, Boolean.class, waitEvent, "%" + queryFragment + "%"))) {
                return;
            }
            Thread.sleep(25);
        }
        throw new AssertionError("Expected database wait on " + queryFragment + ": " + waitEvent);
    }

    @Test
    void providerFailuresKeepCleanupTargetsAndRetryFromDurableState() throws Exception {
        UUID actor = seedUser();
        AUTH_STATUS.set(503);
        STORAGE_STATUS.set(500);
        UUID requestId = completeThroughHttp(actor);
        assertDeletedProfile(actor);
        var failed = jdbc.queryForMap("""
                select pending_profile_image_path,auth_user_delete_status,auth_user_delete_error_code
                from account_deletion_requests where id=?
                """, requestId);
        assertThat(failed.get("pending_profile_image_path")).isEqualTo(actor + "/avatar.jpg");
        assertThat(failed.get("auth_user_delete_status")).isEqualTo("failed_retryable");
        assertThat(failed.get("auth_user_delete_error_code")).isEqualTo("http_503");
        retryService.retryCleanup();
        assertThat(AUTH_CALLS.get()).isEqualTo(1);
        assertThat(STORAGE_CALLS.get()).isEqualTo(1);
        AUTH_STATUS.set(404);
        STORAGE_STATUS.set(404);
        jdbc.update("update account_deletion_requests set updated_at=now()-interval '16 minutes' where id=?", requestId);
        retryService.retryCleanup();
        var recovered = jdbc.queryForMap("""
                select pending_profile_image_path,auth_user_delete_status,auth_user_deleted_at,
                    auth_user_delete_error_code,retention_note from account_deletion_requests where id=?
                """, requestId);
        assertThat(recovered.get("pending_profile_image_path")).isNull();
        assertThat(recovered.get("auth_user_delete_status")).isEqualTo("not_found");
        assertThat(recovered.get("auth_user_deleted_at")).isNotNull();
        assertThat(recovered.get("auth_user_delete_error_code")).isNull();
        assertThat(recovered.get("retention_note").toString()).contains("already absent");
        retryService.retryCleanup();
        assertThat(AUTH_CALLS.get()).isEqualTo(2);
        assertThat(STORAGE_CALLS.get()).isEqualTo(2);
    }

    @Test
    void nonRetryableAuthFailureDoesNotPreventImageRetryOrRepeatAuthDeletion() throws Exception {
        UUID actor = seedUser();
        AUTH_STATUS.set(403);
        STORAGE_STATUS.set(500);
        UUID requestId = completeThroughHttp(actor);
        jdbc.update("update account_deletion_requests set updated_at=now()-interval '16 minutes' where id=?", requestId);
        STORAGE_STATUS.set(200);
        retryService.retryCleanup();
        var result = jdbc.queryForMap("select pending_profile_image_path,auth_user_delete_status from account_deletion_requests where id=?", requestId);
        assertThat(result.get("pending_profile_image_path")).isNull();
        assertThat(result.get("auth_user_delete_status")).isEqualTo("failed_non_retryable");
        assertThat(AUTH_CALLS.get()).isEqualTo(1);
        assertThat(STORAGE_CALLS.get()).isEqualTo(2);
    }

    private UUID completeThroughHttp(UUID actor) throws Exception {
        JsonNode created = accepted(post(actor, "/me", "{}"), 201);
        UUID requestId = UUID.fromString(created.path("id").asText());
        JsonNode verified = accepted(post(actor, "/me/verify", "{\"request_id\":\"%s\",\"code\":\"%s\"}"
                .formatted(requestId, created.path("debug_verification_code").asText())), 200);
        accepted(post(actor, "/me/confirm", confirmation(requestId, verified.path("deletion_authorization").asText())), 200);
        return requestId;
    }

    private String confirmation(UUID requestId, String authorization) {
        return "{\"request_id\":\"%s\",\"deletion_authorization\":\"%s\",\"confirm\":true}"
                .formatted(requestId, authorization);
    }

    private UUID seedUser() {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into app_users(id,email,name,role,organization_type,organization_name,profile_image_path,profile_image_url)
                values (?,?,'Fixture','both','company','Fixture company',?,?)
                """, id, id + "@example.invalid", id + "/avatar.jpg", "https://example.invalid/avatar.jpg");
        for (boolean enabled : new boolean[] {true, false}) {
            UUID device = UUID.randomUUID();
            jdbc.update("""
                    insert into push_devices(id,user_id,platform,provider,environment,token,token_hash,
                        installation_id,device_label,permission_status,enabled)
                    values (?,?,'ios','apns','development',?,?,?,'Fixture device','granted',?)
                    """, device, id, "token-" + device, "hash-" + device, "install-" + device, enabled);
        }
        return id;
    }

    private void assertOrganizationUnchanged(UUID actor) {
        var row = jdbc.queryForMap("select organization_type,organization_name from app_users where id=?", actor);
        assertThat(row.get("organization_type")).isEqualTo("company");
        assertThat(row.get("organization_name")).isEqualTo("Fixture company");
    }

    private void assertDeletedProfile(UUID actor) {
        assertDeletedProfile(actor, 2);
    }

    private void assertDeletedProfile(UUID actor, int deviceCount) {
        var row = jdbc.queryForMap("""
                select organization_type,organization_name,profile_image_path,profile_image_url,
                    deleted_at,deletion_completed_at from app_users where id=?
                """, actor);
        for (String field : new String[] {"organization_type", "organization_name", "profile_image_path", "profile_image_url"}) {
            assertThat(row.get(field)).as(field).isNull();
        }
        assertThat(row.get("deleted_at")).isNotNull();
        assertThat(row.get("deletion_completed_at")).isNotNull();
        var devices = jdbc.queryForList("select id,token,token_hash,installation_id,device_label,enabled from push_devices where user_id=?", actor);
        assertThat(devices).hasSize(deviceCount);
        for (var device : devices) {
            assertThat(device.get("token")).isEqualTo("");
            assertThat(device.get("token_hash")).isEqualTo("deleted-device:" + device.get("id"));
            assertThat(device.get("installation_id")).isNull();
            assertThat(device.get("device_label")).isNull();
            assertThat(device.get("enabled")).isEqualTo(false);
        }
    }

    private JsonNode accepted(HttpResponse<String> response, int status) throws Exception {
        assertThat(response.statusCode()).withFailMessage("HTTP %s: %s", response.statusCode(), response.body()).isEqualTo(status);
        return JSON.readTree(response.body());
    }

    private HttpResponse<String> post(UUID actor, String path, String body) throws Exception {
        return postApi(actor, "/api/v1/account-deletion-requests" + path, body);
    }

    private HttpResponse<String> postApi(UUID actor, String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(15)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (actor != null) {
            var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(SIGNING_KEY.getKeyID()).build(),
                    new JWTClaimsSet.Builder().subject(actor.toString()).issuer(providerUrl() + "/auth/v1")
                            .audience("authenticated").issueTime(new Date())
                            .expirationTime(Date.from(Instant.now().plusSeconds(120))).build());
            jwt.sign(new RSASSASigner(SIGNING_KEY));
            request.header("Authorization", "Bearer " + jwt.serialize());
        }
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }

    private static RSAKey signingKey() {
        try {
            return new RSAKeyGenerator(2048).keyID("deletion-fixture").generate();
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String providerUrl() {
        return "http://127.0.0.1:" + PROVIDER.getAddress().getPort();
    }

    private static HttpServer providerServer() {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", exchange -> {
                String path = exchange.getRequestURI().getPath();
                int status;
                String body = "{}";
                if (path.equals("/auth/v1/.well-known/jwks.json") && "GET".equals(exchange.getRequestMethod())) {
                    status = 200;
                    body = new JWKSet(SIGNING_KEY.toPublicJWK()).toString();
                } else if ("DELETE".equals(exchange.getRequestMethod())
                        && "sb_secret_local_fixture_only".equals(exchange.getRequestHeaders().getFirst("apikey"))) {
                    if (path.startsWith("/auth/v1/admin/users/")) {
                        AUTH_CALLS.incrementAndGet();
                        status = AUTH_STATUS.get();
                    } else if (path.startsWith("/storage/v1/object/profileimage/")) {
                        STORAGE_CALLS.incrementAndGet();
                        status = STORAGE_STATUS.get();
                    } else {
                        status = 400;
                    }
                } else {
                    status = 400;
                }
                byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(status, bytes.length);
                try (var output = exchange.getResponseBody()) {
                    output.write(bytes);
                }
                exchange.close();
            });
            server.start();
            return server;
        } catch (java.io.IOException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
