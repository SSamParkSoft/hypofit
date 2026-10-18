package com.contentruck.hypofit.applicant.controller;

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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
        "hypofit.push.push-worker-enabled=false",
        "hypofit.push.enabled=true",
        "hypofit.ai-summary-worker-enabled=false"
})
@ActiveProfiles("test")
@Testcontainers
class ApplicationSharingConsentHttpIntegrationTest {
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
        jdbcTemplate.execute("truncate table app_users, audit_events cascade");
    }

    private static final String SECRET = "legal-evidence-http-test-only-secret-32-bytes";

    @Value("${hypofit.privacy.application-sharing-consent-required:false}")
    private boolean required;

    @Value("${local.server.port}")
    private int port;

    @Test
    void missingConsentFollowsGateAndAuthenticationIsRequired() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        String body = body(seedPost(owner), null);
        assertThat(post(null, body).statusCode()).isEqualTo(401);
        var response = post(actor, body);
        assertThat(response.statusCode()).isEqualTo(required ? 422 : 201);
        if (required) {
            assertThat(response.body()).contains("application_sharing_consent_required");
        }
        assertThat(count("application_sharing_consents")).isZero();
        assertThat(count("applications")).isEqualTo(required ? 0 : 1);
        assertThat(count("notifications")).isEqualTo(required ? 0 : 1);
    }

    @Test
    void invalidConsentAlwaysFailsBeforeApplicationInsert() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        String valid = consent(owner, "web_application");
        for (String invalid : new String[] {
                "null", "false", "[]", "{}",
                valid.replace("2026-10-16.application-sharing.v1", "unknown"),
                valid.replace(owner.toString(), actor.toString()),
                valid.replace(owner.toString(), "not-a-uuid"),
                valid.replace("true", "false"),
                valid.replace("true", "\"true\""),
                valid.replace("\"accepted\":true", "\"terms_accepted\":true"),
                valid.replace("\"accepted\":true", "\"accepted\":true,\"recipient_name\":\"Spoofed\""),
                valid.replace("web_application", "unknown"),
                valid.replace("\"source\":\"web_application\"", "\"source\":null")
        }) {
            var response = post(actor, body(postId, invalid));
            assertThat(response.statusCode()).as(invalid).isEqualTo(422);
            assertThat(response.body()).contains("application_sharing_consent_invalid");
        }
        assertThat(count("applications")).isZero();
        assertThat(count("application_sharing_consents")).isZero();
        assertThat(count("notifications")).isZero();
    }

    @Test
    void recordsTrustedIdentitySnapshotAndDatabaseTimeForAllSources() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        for (String source : new String[] {"web_application", "ios_application", "android_application"}) {
            UUID postId = seedPost(owner);
            Instant before = Instant.now();
            String body = body(postId, consent(owner, source));
            assertThat(post(actor, body).statusCode()).isEqualTo(201);
            var row = jdbcTemplate.queryForMap("""
                    select c.*, c.disclosure_snapshot->>'recipient_name' as recipient_name,
                        c.disclosure_snapshot->>'recipient_id' as snapshot_recipient,
                        c.disclosure_snapshot->>'purpose' as purpose,
                        c.disclosure_snapshot->>'fields' as fields,
                        c.disclosure_snapshot->>'retention' as retention,
                        c.disclosure_snapshot->>'refusal' as refusal
                    from application_sharing_consents c join applications a on a.id = c.application_id
                    where a.interview_post_id = ?
                    """, postId);
            assertThat(row.get("applicant_id")).isEqualTo(actor);
            assertThat(row.get("recipient_id")).isEqualTo(owner);
            assertThat(row.get("snapshot_recipient")).isEqualTo(owner.toString());
            assertThat(row.get("recipient_name")).isEqualTo("Original");
            assertThat(row.get("revision")).isEqualTo("2026-10-16.application-sharing.v1");
            assertThat(row.get("source")).isEqualTo(source);
            assertThat(row.get("purpose")).isEqualTo("지원자 검토·선정과 참여 진행");
            assertThat(row.get("fields")).isEqualTo("이름, 프로필 사진, 한줄소개, 계정 역할, 사용자 식별자, 제출 답변, 가능한 시간");
            assertThat(row.get("retention")).isEqualTo(
                    com.contentruck.hypofit.applicant.service.ApplicationSharingConsent.RETENTION);
            assertThat(row.get("refusal")).isEqualTo("동의를 거부해도 공고를 탐색할 수 있지만 해당 신청서는 제출할 수 없습니다.");
            assertThat(((java.sql.Timestamp) row.get("accepted_at")).toInstant())
                    .isBetween(before.minusSeconds(1), Instant.now().plusSeconds(1));
            assertThat(post(actor, body).statusCode()).isEqualTo(409);
            assertThat(jdbcTemplate.queryForObject(
                    "select accepted_at from application_sharing_consents where application_id = ?",
                    java.sql.Timestamp.class, row.get("application_id"))).isEqualTo(row.get("accepted_at"));
        }
        assertThat(count("application_sharing_consents")).isEqualTo(3);
        assertThat(count("notifications")).isEqualTo(3);
    }

    @Test
    void evidenceFailureRollsBackApplicationAndDoesNotBecomeDuplicateConflict() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        jdbcTemplate.execute("alter table application_sharing_consents add constraint test_reject_evidence check (false)");
        try {
            assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(500);
            assertThat(count("applications")).isZero();
            assertThat(count("application_sharing_consents")).isZero();
            assertThat(count("notifications")).isZero();
        } finally {
            jdbcTemplate.execute("alter table application_sharing_consents drop constraint test_reject_evidence");
        }
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
    }

    @Test
    void notificationFailureRollsBackApplicationAndEvidence() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        jdbcTemplate.execute("alter table notifications add constraint test_reject_notification check (false)");
        try {
            assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(500);
            assertThat(count("applications")).isZero();
            assertThat(count("application_sharing_consents")).isZero();
            assertThat(count("notifications")).isZero();
        } finally {
            jdbcTemplate.execute("alter table notifications drop constraint test_reject_notification");
        }
    }

    @Test
    void rejectsClientActorAndPreservesEvidenceOnApplicationWithdrawal() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        String body = body(postId, consent(owner, "web_application"));
        assertThat(post(actor, body.replace("{\"interview_post_id\"", "{\"applicant_id\":\"" + owner
                + "\",\"interview_post_id\"")).statusCode()).isEqualTo(422);
        assertThat(count("applications")).isZero();
        assertThat(post(actor, body).statusCode()).isEqualTo(201);
        var evidence = jdbcTemplate.queryForMap("select * from application_sharing_consents");
        assertThat(send(actor, "/api/v1/applications/" + evidence.get("application_id") + "/withdraw", "{}")
                .statusCode()).isEqualTo(200);
        var after = jdbcTemplate.queryForMap("select * from application_sharing_consents");
        assertThat(after.get("application_ended_at")).isNotNull();
        after.remove("application_ended_at");
        evidence.remove("application_ended_at");
        assertThat(after).isEqualTo(evidence);
    }

    @Test
    void sharingWithdrawalBlocksOwnerReadsAndWritesButPreservesApplicantAndEvidence() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID stranger = seedUser();
        UUID postId = seedPost(owner);
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID id = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        String detail = "/api/v1/applications/" + id;
        String withdraw = detail + "/sharing-consent/withdraw";
        assertThat(send(null, withdraw, "{}").statusCode()).isEqualTo(401);
        assertThat(send(owner, withdraw, "{}").statusCode()).isEqualTo(403);
        assertThat(send(stranger, withdraw, "{}").statusCode()).isEqualTo(403);
        assertThat(get(owner, detail).statusCode()).isEqualTo(200);
        assertThat(get(actor, detail).body()).contains("\"sharing_withdrawn_at\":null");
        assertThat(send(actor, withdraw, "{}").statusCode()).isEqualTo(204);
        var time = jdbcTemplate.queryForObject("select sharing_withdrawn_at from applications", java.sql.Timestamp.class);
        assertThat(time).isNotNull();
        assertThat(get(owner, detail).statusCode()).isEqualTo(404);
        assertThat(request(owner, detail + "/status", "PATCH", "{\"status\":\"selected\"}").statusCode()).isEqualTo(404);
        assertThat(get(owner, "/api/v1/applications/").body()).isEqualTo("[]");
        assertThat(get(actor, detail).statusCode()).isEqualTo(200);
        assertThat(get(actor, detail).body()).contains("\"sharing_withdrawn_at\":\"");
        assertThat(get(actor, "/api/v1/applications/").body()).contains(id.toString());
        assertThat(send(actor, withdraw, "{}").statusCode()).isEqualTo(204);
        assertThat(jdbcTemplate.queryForObject("select sharing_withdrawn_at from applications", java.sql.Timestamp.class)).isEqualTo(time);
        assertThat(jdbcTemplate.queryForObject("select count(*) from audit_events where event_type='application_sharing_withdrawn' and target_id=?", Integer.class, id)).isEqualTo(1);
        assertThat(count("application_sharing_consents")).isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("select status from applications", String.class)).isEqualTo("applied");
        assertThat(send(actor, detail + "/withdraw", "{}").statusCode()).isEqualTo(200);
        jdbcTemplate.update("delete from application_sharing_consents");
        assertThat(get(owner, detail).statusCode()).isEqualTo(404);
    }

    @Test
    void operatorWithdrawalRequiresAdminAndMatchingInReviewPrivacyTicket() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID admin = seedUser();
        UUID ticket = UUID.randomUUID();
        assertThat(post(actor, body(seedPost(owner), consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID id = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        jdbcTemplate.update("insert into admin_users(user_id) values (?)", admin);
        jdbcTemplate.update("""
                insert into support_tickets(id,user_id,kind,category,body,contact_email,status)
                values (?,?,'inquiry','privacy','Fixture request','fixture@example.invalid','open')
                """, ticket, actor);
        String path = "/api/v1/admin/support/tickets/" + ticket + "/applications/" + id + "/withdraw-sharing";
        assertThat(send(actor, path, "{}").statusCode()).isEqualTo(403);
        assertThat(send(admin, path, "{}").statusCode()).isEqualTo(409);
        jdbcTemplate.update("update support_tickets set status='in_review',user_id=? where id=?", owner, ticket);
        assertThat(send(admin, path, "{}").statusCode()).isEqualTo(409);
        jdbcTemplate.update("update support_tickets set user_id=? where id=?", actor, ticket);
        assertThat(send(admin, path, "{}").statusCode()).isEqualTo(204);
        assertThat(get(owner, "/api/v1/applications/" + id).statusCode()).isEqualTo(404);
        assertThat(jdbcTemplate.queryForObject("select status from support_tickets where id=?", String.class, ticket))
                .isEqualTo("in_review");
    }

    private int count(String table) {
        return jdbcTemplate.queryForObject("select count(*) from " + table, Integer.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"application", "chat_room", "interview_session"})
    void withdrawnOwnerNotificationsAreSuppressedAndQueuedPushIsSkipped(String targetType) throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID admin = seedUser();
        UUID postId = seedPost(owner);
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID id = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        UUID room = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbcTemplate.update("update applications set status='selected' where id=?", id);
        jdbcTemplate.update("""
                insert into chat_rooms(id,interview_post_id,application_id,founder_id,respondent_id,status)
                values (?,?,?,?,?,'selected')
                """, room, postId, id, owner, actor);
        jdbcTemplate.update("""
                insert into interview_sessions(id,application_id,scheduled_at,meeting_type,status)
                values (?,?,now()+interval '1 day','online','scheduled')
                """, session, id);
        UUID targetId = switch (targetType) {
            case "chat_room" -> room;
            case "interview_session" -> session;
            default -> id;
        };
        UUID notification = UUID.randomUUID();
        UUID device = UUID.randomUUID();
        UUID delivery = UUID.randomUUID();
        jdbcTemplate.update("insert into admin_users(user_id) values (?)", admin);
        jdbcTemplate.update("insert into notification_preferences(user_id,push_enabled) values (?,true)", owner);
        jdbcTemplate.update("""
                insert into notifications(id,user_id,type,title,body,target_type,target_id)
                values (?,?,'chat_message','Fixture','Queued before withdrawal',?,?)
                """, notification, owner, targetType, targetId);
        jdbcTemplate.update("""
                insert into push_devices(id,user_id,platform,provider,environment,token,token_hash,permission_status)
                values (?,?,'ios','apns','development','fixture-token','fixture-hash','granted')
                """, device, owner);
        jdbcTemplate.update("""
                insert into push_deliveries(id,notification_id,push_device_id,user_id,provider,status)
                values (?,?,?,?,'apns','pending')
                """, delivery, notification, device, owner);
        assertThat(send(actor, "/api/v1/applications/" + id + "/sharing-consent/withdraw", "{}").statusCode()).isEqualTo(204);
        int notificationsBefore = count("notifications");
        String notifyBody = """
                {"email":"%s@example.invalid","type":"session_canceled","target_type":"%s","target_id":"%s","dispatch":false}
                """.formatted(owner, targetType, targetId);
        assertThat(send(admin, "/api/v1/admin/notifications/test", notifyBody).statusCode()).isEqualTo(409);
        assertThat(count("notifications")).isEqualTo(notificationsBefore);
        assertThat(send(admin, "/api/v1/admin/push-deliveries/dispatch", "{}").statusCode()).isEqualTo(200);
        var outcome = jdbcTemplate.queryForMap("select status,provider_error_code from push_deliveries where id=?", delivery);
        assertThat(outcome.get("status")).isEqualTo("skipped");
        assertThat(outcome.get("provider_error_code")).isEqualTo("push_recipient_ineligible");
        assertThat(send(admin, "/api/v1/admin/notifications/test", notifyBody.replace(owner.toString(), actor.toString())).statusCode())
                .isEqualTo(200);
    }

    @Test
    void failedAuditRollsBackSharingRestriction() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        assertThat(post(actor, body(seedPost(owner), consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID id = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        jdbcTemplate.execute("alter table audit_events add constraint test_reject_withdrawal_audit check (event_type <> 'application_sharing_withdrawn')");
        try {
            assertThat(send(actor, "/api/v1/applications/" + id + "/sharing-consent/withdraw", "{}").statusCode()).isEqualTo(500);
            assertThat(jdbcTemplate.queryForObject("select sharing_withdrawn_at from applications", java.sql.Timestamp.class)).isNull();
            assertThat(get(owner, "/api/v1/applications/" + id).statusCode()).isEqualTo(200);
        } finally {
            jdbcTemplate.execute("alter table audit_events drop constraint test_reject_withdrawal_audit");
        }
    }

    @Test
    void selectedChatAndSessionCannotBypassWithdrawal() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID id = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        UUID room = UUID.randomUUID();
        jdbcTemplate.update("update applications set status='selected', answers='{\"reason\":\"private-fixture\"}'::jsonb where id=?", id);
        jdbcTemplate.update("""
                insert into chat_rooms(id,interview_post_id,application_id,founder_id,respondent_id,status)
                values (?,?,?,?,?,'selected')
                """, room, postId, id, owner, actor);
        jdbcTemplate.update("""
                insert into interview_sessions(id,application_id,scheduled_at,meeting_type,status)
                values (?,?,now()+interval '1 day','online','scheduled')
                """, UUID.randomUUID(), id);
        String roomPath = "/api/v1/chat/rooms/" + room;
        assertThat(get(owner, roomPath).body()).contains("private-fixture");
        assertThat(get(owner, "/api/v1/sessions/").body()).contains("private-fixture");
        assertThat(send(actor, roomPath + "/messages", "{\"body\":\"Before withdrawal\"}").statusCode()).isEqualTo(201);
        int messagesBefore = count("chat_messages");
        int notificationsBefore = count("notifications");
        assertThat(send(actor, "/api/v1/applications/" + id + "/sharing-consent/withdraw", "{}").statusCode()).isEqualTo(204);
        assertThat(get(owner, roomPath).statusCode()).isEqualTo(404);
        assertThat(get(owner, roomPath + "/workflow").statusCode()).isEqualTo(404);
        assertThat(get(owner, roomPath + "/messages").statusCode()).isEqualTo(404);
        assertThat(get(owner, "/api/v1/chat/rooms/").body()).isEqualTo("[]");
        assertThat(get(owner, "/api/v1/sessions/").body()).isEqualTo("[]");
        assertThat(get(actor, roomPath).statusCode()).isEqualTo(200);
        assertThat(get(actor, roomPath).body()).contains("\"sharing_withdrawn_at\":\"");
        assertThat(get(actor, roomPath + "/workflow").body()).contains("\"step\":\"closed\"");
        assertThat(get(actor, roomPath + "/messages").body()).contains("Before withdrawal");
        assertThat(send(actor, roomPath + "/messages", "{\"body\":\"After withdrawal\"}").statusCode()).isEqualTo(409);
        assertThat(send(owner, roomPath + "/messages", "{\"body\":\"After withdrawal\"}").statusCode()).isEqualTo(409);
        assertThat(count("chat_messages")).isEqualTo(messagesBefore);
        assertThat(count("notifications")).isEqualTo(notificationsBefore);
        assertThat(get(actor, "/api/v1/sessions/").body()).contains("private-fixture");
    }

    @ParameterizedTest
    @ValueSource(strings = {"submitted", "confirmed"})
    void surveyOrganizerCannotReadOrConfirmWithdrawnApplication(String participationStatus) throws Exception {
        UUID actor = seedUser();
        UUID other = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        assertThat(post(other, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID application = jdbcTemplate.queryForObject("select id from applications where respondent_id=?", UUID.class, actor);
        prepareSurvey(postId, "application_required");
        seedSurveyParticipation(postId, actor, participationStatus);
        seedSurveyParticipation(postId, other, "submitted");
        String path = "/api/v1/interview-posts/" + postId + "/survey";
        assertThat(get(owner, path + "/participants").body()).contains(actor.toString(), other.toString());
        var before = jdbcTemplate.queryForMap("select status,confirmed_at from survey_participations where participant_id=?", actor);

        assertThat(send(actor, "/api/v1/applications/" + application + "/sharing-consent/withdraw", "{}").statusCode()).isEqualTo(204);
        var listing = get(owner, path + "/participants");
        assertThat(listing.statusCode()).isEqualTo(200);
        assertThat(listing.body()).doesNotContain(actor.toString()).contains(other.toString());
        String confirm = "{\"participant_id\":\"" + actor + "\"}";
        assertThat(send(owner, path + "/confirm", confirm).statusCode()).isEqualTo(404);
        assertThat(jdbcTemplate.queryForMap("select status,confirmed_at from survey_participations where participant_id=?", actor))
                .isEqualTo(before);
        var own = get(actor, path + "/participation");
        assertThat(own.statusCode()).isEqualTo(200);
        assertThat(own.body()).contains(actor.toString(), participationStatus);
        String otherConfirm = "{\"participant_id\":\"" + other + "\"}";
        assertThat(send(owner, path + "/confirm", otherConfirm).statusCode()).isEqualTo(200);
        assertThat(send(owner, path + "/confirm", otherConfirm).statusCode()).isEqualTo(200);
    }

    @Test
    void directSurveyRemainsIndependentOfLegacyApplicationSharing() throws Exception {
        UUID actor = seedUser();
        UUID owner = seedUser();
        UUID postId = seedPost(owner);
        assertThat(post(actor, body(postId, consent(owner, "web_application"))).statusCode()).isEqualTo(201);
        UUID application = jdbcTemplate.queryForObject("select id from applications", UUID.class);
        prepareSurvey(postId, "direct");
        seedSurveyParticipation(postId, actor, "submitted");
        assertThat(send(actor, "/api/v1/applications/" + application + "/sharing-consent/withdraw", "{}").statusCode()).isEqualTo(204);
        String path = "/api/v1/interview-posts/" + postId + "/survey";
        assertThat(get(owner, path + "/participants").body()).contains(actor.toString());
        assertThat(send(owner, path + "/confirm", "{\"participant_id\":\"" + actor + "\"}").statusCode()).isEqualTo(200);
    }

    private void prepareSurvey(UUID postId, String entryMode) {
        jdbcTemplate.update("""
                update interview_posts set recruitment_type='survey',entry_mode=?,
                    external_provider='google_forms',external_url='https://forms.gle/fixture',
                    participation_deadline_at=now()+interval '1 day',external_data_notice='Fixture'
                where id=?
                """, entryMode, postId);
    }

    private void seedSurveyParticipation(UUID postId, UUID participantId, String status) {
        jdbcTemplate.update("""
                insert into survey_participations(post_id,participant_id,status,opened_at,submitted_at,confirmed_at)
                values (?,?,?,now(),now(),case when ?='confirmed' then now() else null end)
                """, postId, participantId, status, status);
    }

    private UUID seedPost(UUID owner) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into interview_posts (id, founder_id, title, service_summary, target_description,
                    reward_amount, duration_minutes, recruit_count, recruitment_type, entry_mode,
                    interview_mode, schedule_options, status)
                values (?, ?, 'Consent fixture', 'Summary', 'Target', 0, 30, 1, 'interview',
                    'application_required', 'online', '[]'::jsonb, 'open')
                """, id, owner);
        return id;
    }

    private String consent(UUID recipient, String source) {
        return """
                {"revision":"2026-10-16.application-sharing.v1","recipient_id":"%s","accepted":true,"source":"%s"}
                """.formatted(recipient, source);
    }

    private String body(UUID postId, String consent) {
        return "{\"interview_post_id\":\"" + postId + "\""
                + (consent == null ? "" : ",\"sharing_consent\":" + consent) + "}";
    }

    private UUID seedUser() {
        UUID userId = UUID.randomUUID();
        jdbcTemplate.update("insert into app_users (id, email, name, role) values (?, ?, 'Original', 'both')",
                userId, userId + "@example.invalid");
        return userId;
    }

    private HttpResponse<String> post(UUID userId, String body) throws Exception {
        return send(userId, "/api/v1/applications/", body);
    }

    private HttpResponse<String> send(UUID userId, String path, String body) throws Exception {
        return request(userId, path, "POST", body);
    }

    private HttpResponse<String> get(UUID userId, String path) throws Exception {
        return request(userId, path, "GET", "");
    }

    private HttpResponse<String> request(UUID userId, String path, String method, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(body));
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
