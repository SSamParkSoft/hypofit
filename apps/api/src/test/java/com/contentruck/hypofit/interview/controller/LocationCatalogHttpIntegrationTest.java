package com.contentruck.hypofit.interview.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        "hypofit.supabase-url=",
        "hypofit.supabase-jwks-url=",
        "hypofit.supabase-jwt-issuer=",
        "hypofit.supabase-jwt-secret=location-catalog-http-test-only-secret-32-bytes",
        "hypofit.push.push-worker-enabled=false",
        "hypofit.ai-summary-worker-enabled=false"
})
@ActiveProfiles("test")
@Testcontainers
class LocationCatalogHttpIntegrationTest {
    private static final String SECRET = "location-catalog-http-test-only-secret-32-bytes";
    private static final String PATH = "/api/v1/interview-posts/location-catalog";
    private static final String FEATURES = "recruitment-types-v1,research-recruitment-v1";
    private final ObjectMapper json = new ObjectMapper();

    @Container
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
            DockerImageName.parse("postgis/postgis:16-3.4-alpine").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
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
    private JdbcTemplate jdbc;

    @Value("${local.server.port}")
    private int port;

    private UUID owner;

    @BeforeEach
    void seedOwner() {
        jdbc.execute("truncate table app_users, audit_events cascade");
        owner = UUID.randomUUID();
        jdbc.update("insert into app_users (id,email,name,role) values (?,?,'Catalog fixture','both')",
                owner, owner + "@example.invalid");
    }

    @Test
    void returnsOnlyVisibleCoordinateBearingOfflinePostsWithoutLocationInput() throws Exception {
        UUID offline = post("offline", "open", "interview");
        UUID both = post("both", "open", "interview");
        UUID online = post("online", "open", "interview");
        UUID missing = post("offline", "open", "interview");
        jdbc.update("update interview_posts set location_latitude=null,location_longitude=null where id=?", missing);
        UUID hidden = post("offline", "hidden", "interview");
        UUID removed = post("offline", "removed", "interview");
        UUID closed = post("offline", "closed", "interview");
        UUID draft = post("offline", "draft", "interview");

        for (UUID viewer : new UUID[] {null, owner}) {
            var response = get(PATH, viewer, FEATURES);
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
            JsonNode body = json.readTree(response.body());
            assertThat(body.size()).isEqualTo(2);
            assertThat(response.body()).contains(offline.toString(), both.toString())
                    .doesNotContain(online.toString(), missing.toString(), hidden.toString(), removed.toString(),
                            closed.toString(), draft.toString());
            for (JsonNode row : body) {
                assertThat(row.get("distance_meters").isNull()).isTrue();
                assertThat(row.get("external_url").isNull()).isTrue();
                assertThat(row.get("ai_summary").isNull()).isTrue();
                assertThat(row.get("images").isEmpty()).isTrue();
            }
        }
        assertThat(get(PATH, null, FEATURES).headers().firstValue("Content-Type").orElse("")).contains("application/json");
    }

    @Test
    void preservesClientCapabilities() throws Exception {
        UUID interview = post("offline", "open", "interview");
        UUID beta = post("both", "open", "beta_test");
        UUID research = post("both", "open", "research_experiment");
        UUID excluded = post("offline", "open", "usability_test");
        var legacy = get(PATH, null, null);
        assertThat(legacy.statusCode()).isEqualTo(200);
        assertThat(legacy.body()).contains(interview.toString()).doesNotContain(beta.toString(), research.toString());
        var typed = get(PATH, null, "recruitment-types-v1");
        assertThat(typed.statusCode()).isEqualTo(200);
        assertThat(typed.body()).contains(interview.toString(), beta.toString()).doesNotContain(research.toString());
        assertThat(get(PATH, null, FEATURES).body()).contains(interview.toString(), beta.toString(), research.toString())
                .doesNotContain(excluded.toString());
    }

    @Test
    void completeCatalogExceedsLegacy100ButRejects501WithoutPartialData() throws Exception {
        seedPosts(500);
        var response = get(PATH, null, FEATURES);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(json.readTree(response.body()).size()).isEqualTo(500);
        var original = get("/api/v1/interview-posts/?status=open", null, FEATURES);
        assertThat(original.statusCode()).isEqualTo(200);
        assertThat(json.readTree(original.body()).size()).isEqualTo(100);

        post("offline", "open", "interview");
        var overflow = get(PATH, null, FEATURES);
        assertThat(overflow.statusCode()).isEqualTo(409);
        assertThat(overflow.body()).contains("location_catalog_capacity_exceeded", "request_id");
        assertThat(json.readTree(overflow.body()).isArray()).isFalse();
    }

    @Test
    void rejectsQueryParametersAndInvalidAuthentication() throws Exception {
        for (String query : new String[] {"lat=37&lng=127", "radius_m=1000", "limit=100"}) {
            var response = get(PATH + "?" + query, null, FEATURES);
            assertThat(response.statusCode()).isEqualTo(422);
        }
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + PATH))
                .header("Authorization", "Bearer invalid").GET().build();
        try (var client = HttpClient.newHttpClient()) {
            assertThat(client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(401);
        }
    }

    @Test
    void retainsLegacyServerDistanceSearchForOldClients() throws Exception {
        UUID near = post("offline", "open", "interview");
        UUID far = post("offline", "open", "interview");
        jdbc.update("""
                update interview_posts set location_latitude=35,
                    location_point=extensions.ST_SetSRID(extensions.ST_MakePoint(126.8,35),4326)::extensions.geography
                where id=?
                """, far);
        var response = get("/api/v1/interview-posts/?status=open&lat=37.3&lng=126.8&radius_m=1000&sort=distance",
                null, FEATURES);
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains(near.toString()).doesNotContain(far.toString());
        assertThat(json.readTree(response.body()).get(0).get("distance_meters").asDouble()).isZero();
    }

    private UUID post(String mode, String status, String type) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into interview_posts(id,founder_id,title,service_summary,target_description,
                    reward_amount,duration_minutes,recruit_count,recruitment_type,entry_mode,
                    interview_mode,schedule_options,status,location_latitude,location_longitude,
                    location_point,beta_test_platforms,beta_test_starts_at,beta_test_ends_at)
                values (?,?,'Catalog fixture','Summary','Target',0,30,1,?,'application_required',?,
                    '[]'::jsonb,?,37.3,126.8,
                    extensions.ST_SetSRID(extensions.ST_MakePoint(126.8,37.3),4326)::extensions.geography,
                    array['ios'],now(),now()+interval '1 day')
                """, id, owner, type, mode, status);
        return id;
    }

    private void seedPosts(int count) {
        jdbc.update("""
                insert into interview_posts(id,founder_id,title,service_summary,target_description,
                    reward_amount,duration_minutes,recruit_count,interview_mode,schedule_options,status,
                    location_latitude,location_longitude)
                select gen_random_uuid(),?,'Catalog '||n,'Summary','Target',0,30,1,'offline','[]'::jsonb,
                    'open',37.3,126.8 from generate_series(1,?) n
                """, owner, count);
    }

    private HttpResponse<String> get(String path, UUID viewer, String features) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET();
        if (features != null) request.header("X-Hypofit-Features", features);
        if (viewer != null) {
            var token = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), new JWTClaimsSet.Builder()
                    .subject(viewer.toString()).audience("authenticated").issueTime(new Date())
                    .expirationTime(Date.from(Instant.now().plusSeconds(60))).build());
            token.sign(new MACSigner(SECRET));
            request.header("Authorization", "Bearer " + token.serialize());
        }
        try (var client = HttpClient.newHttpClient()) {
            return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
