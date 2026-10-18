package com.contentruck.hypofit.user.controller;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
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
        "hypofit.supabase-url=",
        "hypofit.supabase-jwks-url=",
        "hypofit.supabase-jwt-issuer=",
        "hypofit.supabase-jwt-secret=legal-evidence-http-test-only-secret-32-bytes",
        "hypofit.legal.published-revision=published-test-revision",
        "hypofit.push.push-worker-enabled=false",
        "hypofit.ai-summary-worker-enabled=false"
})
@ActiveProfiles("test")
@Testcontainers
class LegalAcknowledgementsHttpIntegrationTest {
    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        // The image preinstalls PostGIS in public; the real baseline owns its extensions schema.
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
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearFixture() {
        jdbcTemplate.execute("truncate table app_users cascade");
    }

    private static final String SECRET = "legal-evidence-http-test-only-secret-32-bytes";
    private static final String EVIDENCE = """
            {"document_revision":"published-test-revision","document_status":"published",
             "action":"signup","source":"web_onboarding","terms_accepted":true,
             "privacy_notice_acknowledged":true,"age_19_confirmed":true}
            """;

    @Value("${local.server.port}")
    private int port;

    @Test
    void legacySyncDoesNotCreateEvidenceAndRequiresAuthentication() throws Exception {
        UUID userId = seedUser();
        assertThat(post(null, "{\"name\":\"Legacy\"}").statusCode()).isEqualTo(401);
        assertThat(post(userId, "{\"name\":\"Legacy\"}").statusCode()).isEqualTo(200);
        assertThat(evidenceCount()).isZero();
    }

    @Test
    void explicitSignupIsJwtBoundAndRepeatedSubmissionPreservesFirstTimestamp() throws Exception {
        UUID userId = seedUser();
        UUID otherUserId = seedUser();
        String body = body(EVIDENCE, "Signed up");
        String spoofed = body.replace("{\"name\"", "{\"user_id\":\"" + otherUserId + "\",\"name\"");
        assertThat(post(userId, spoofed).statusCode()).isEqualTo(422);
        assertThat(evidenceCount()).isZero();
        Instant before = Instant.now();
        assertThat(post(userId, body).statusCode()).isEqualTo(200);
        var first = jdbcTemplate.queryForMap("select * from user_legal_acknowledgements");
        assertThat(first.get("user_id")).isEqualTo(userId);
        assertThat(first.get("terms_accepted")).isEqualTo(true);
        assertThat(first.get("privacy_notice_acknowledged")).isEqualTo(true);
        assertThat(first.get("age_19_confirmed")).isEqualTo(true);
        assertThat(((java.sql.Timestamp) first.get("acknowledged_at")).toInstant())
                .isBetween(before.minusSeconds(1), Instant.now().plusSeconds(1));
        assertThat(post(userId, body).statusCode()).isEqualTo(200);
        assertThat(jdbcTemplate.queryForMap("select * from user_legal_acknowledgements")).isEqualTo(first);
    }

    @Test
    void rejectsDraftUnknownRevisionActionSourceAndMissingConfirmationWithoutProfileMutation() throws Exception {
        UUID userId = seedUser();
        for (String invalid : new String[] {
                EVIDENCE.replace("published\"", "draft\""),
                EVIDENCE.replace("published-test-revision", "unknown"),
                EVIDENCE.replace("signup", "profile_sync"),
                EVIDENCE.replace("web_onboarding", "unknown"),
                EVIDENCE.replace("\"terms_accepted\":true", "\"terms_accepted\":false"),
                EVIDENCE.replace("\"privacy_notice_acknowledged\":true", "\"privacy_notice_acknowledged\":null"),
                EVIDENCE.replace("\"age_19_confirmed\":true", "\"age_19_confirmed\":false")
        }) {
            assertThat(post(userId, body(invalid, "Must not persist")).statusCode()).isEqualTo(422);
        }
        assertThat(evidenceCount()).isZero();
        assertThat(jdbcTemplate.queryForObject("select name from app_users where id = ?", String.class, userId))
                .isEqualTo("Original");
    }

    @Test
    void evidenceFailureRollsBackProfileWrite() throws Exception {
        UUID userId = seedUser();
        jdbcTemplate.execute("alter table user_legal_acknowledgements add constraint test_reject_evidence check (false)");
        try {
            assertThat(post(userId, body(EVIDENCE, "Must roll back")).statusCode()).isEqualTo(500);
            assertThat(jdbcTemplate.queryForObject("select name from app_users where id = ?", String.class, userId))
                    .isEqualTo("Original");
            assertThat(evidenceCount()).isZero();
        } finally {
            jdbcTemplate.execute("alter table user_legal_acknowledgements drop constraint test_reject_evidence");
        }
    }

    private UUID seedUser() {
        UUID userId = UUID.randomUUID();
        jdbcTemplate.update("insert into app_users (id, email, name, role) values (?, ?, 'Original', 'both')",
                userId, userId + "@example.invalid");
        return userId;
    }

    private int evidenceCount() {
        return jdbcTemplate.queryForObject("select count(*) from user_legal_acknowledgements", Integer.class);
    }

    private String body(String evidence, String name) {
        return "{\"name\":\"" + name + "\",\"legal_acknowledgements\":" + evidence + "}";
    }

    private HttpResponse<String> post(UUID userId, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/me/sync"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (userId != null) {
            var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), new JWTClaimsSet.Builder()
                    .subject(userId.toString()).audience("authenticated")
                    .issueTime(new Date()).expirationTime(Date.from(Instant.now().plusSeconds(60))).build());
            jwt.sign(new MACSigner(SECRET));
            request.header("Authorization", "Bearer " + jwt.serialize());
        }
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
