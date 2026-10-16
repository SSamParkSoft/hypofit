package com.contentruck.hypofit.interview.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.contentruck.hypofit.applicant.service.ApplicationWorkflowService;
import com.contentruck.hypofit.chat.service.ChatService;
import com.contentruck.hypofit.common.config.HypofitProperties;
import com.contentruck.hypofit.common.error.HypofitException;
import com.contentruck.hypofit.common.error.HypofitValidationException;
import com.contentruck.hypofit.interview.dto.InterviewPostRequestParser;
import com.contentruck.hypofit.interview.dto.InterviewPostResponse;
import com.contentruck.hypofit.interview.service.InterviewPostClientUpgradeRequiredException;
import com.contentruck.hypofit.interview.service.InterviewPostListCriteria;
import com.contentruck.hypofit.interview.service.InterviewPostQueryService;
import com.contentruck.hypofit.interview.service.InterviewPostRecruitmentTypeNotSupportedException;
import com.contentruck.hypofit.interview.service.InterviewPostWriteRepository;
import com.contentruck.hypofit.interview.service.InterviewPostWriteService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.flywaydb.core.Flyway;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.server.ResponseStatusException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "hypofit.research-recruitment-creation-enabled=true")
class ResearchRecruitmentPostgresIntegrationTest {
    private static final PostgreSQLContainer POSTGRES = startPostgres();
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private InterviewPostWriteService writes;
    @Autowired private InterviewPostQueryService queries;
    @Autowired private InterviewPostWriteRepository repository;
    @Autowired private ApplicationWorkflowService applications;
    @Autowired private ChatService chats;
    @Autowired private HypofitProperties properties;

    private final ObjectMapper mapper = new ObjectMapper();

    @DynamicPropertySource
    static void configurePostgres(DynamicPropertyRegistry registry) {
        registry.add("hypofit.database-url", () -> "postgresql://%s:%s@%s:%d/%s".formatted(
                POSTGRES.getUsername(), POSTGRES.getPassword(), POSTGRES.getHost(), POSTGRES.getMappedPort(5432), POSTGRES.getDatabaseName()));
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.jpa.properties.hibernate.boot.allow_jdbc_metadata_access", () -> true);
    }

    @BeforeEach
    void truncateTestData() {
        jdbcTemplate.execute("truncate table app_users restart identity cascade");
    }

    private static PostgreSQLContainer startPostgres() {
        var postgres = new PostgreSQLContainer(DockerImageName.parse("postgis/postgis:16-3.4-alpine")
                .asCompatibleSubstituteFor("postgres"))
                .withDatabaseName("hypofit_research_test").withUsername("postgres").withPassword("postgres");
        postgres.start();
        Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration").load().migrate();
        // The portable Flyway baseline omits Supabase's legacy PostGIS extension and geography column.
        try (var connection = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
                var statement = connection.createStatement()) {
            statement.execute("drop extension if exists postgis cascade");
            statement.execute("create extension postgis with schema extensions");
            statement.execute("alter table interview_posts add column location_point extensions.geography(Point,4326)");
        } catch (java.sql.SQLException exception) {
            throw new ExceptionInInitializerError(exception);
        }
        return postgres;
    }

    @ParameterizedTest
    @ValueSource(strings = {"online", "offline", "both"})
    void preservesResearchValuesAndSupportsSelectedChatWithoutInterviewSession(String mode) throws Exception {
        UUID owner = user();
        UUID participant = user();
        UUID outsider = user();
        UUID submission = UUID.randomUUID();
        var command = InterviewPostRequestParser.parseCreate(payload(mode));
        var created = writes.createPost(owner, command, submission);
        assertThat(writes.createPost(owner, command, submission).id()).isEqualTo(created.id());
        var detail = InterviewPostResponse.from(queries.getVisiblePost(created.id(), null, false, true, true));
        assertThat(detail.recruitmentType()).isEqualTo("research_experiment");
        assertThat(detail.entryMode()).isEqualTo("application_required");
        assertThat(detail.serviceSummary()).isEqualTo(command.serviceSummary());
        assertThat(detail.targetDescription()).isEqualTo(command.targetDescription());
        assertThat(detail.durationValue()).isEqualTo(1);
        assertThat(detail.durationUnit()).isEqualTo("hours");
        assertThat(detail.durationMinutes()).isEqualTo(60);
        assertThat(detail.interviewMode()).isEqualTo(mode);
        assertThat(detail.scheduleFixedSlots()).containsExactly("2099-09-15T10:00:00+09:00");
        assertThat(detail.scheduleNote()).isEqualTo(command.creationConfiguration().scheduleNote());
        assertThat(detail.compensations()).singleElement().satisfies(item -> assertThat(item.label()).isEqualTo("커피 기프티콘"));
        var stored = repository.findPost(created.id()).orElseThrow();
        if ("online".equals(mode)) {
            assertThat(stored.locationLatitude()).isNull();
        } else {
            assertThat(stored.locationLatitude()).isEqualTo(37.3);
            assertThat(stored.locationLongitude()).isEqualTo(126.8);
            assertThat(detail.locationText()).isEqualTo("안산 연구 공간");
            assertThat(jdbcTemplate.queryForObject("select extensions.ST_Y(location_point::extensions.geometry) from interview_posts where id = ?",
                    Double.class, created.id())).isEqualTo(37.3);
            assertThat(jdbcTemplate.queryForObject("select extensions.ST_X(location_point::extensions.geometry) from interview_posts where id = ?",
                    Double.class, created.id())).isEqualTo(126.8);
        }
        assertThatThrownBy(() -> queries.getVisiblePost(created.id(), null, false, true))
                .isInstanceOf(InterviewPostClientUpgradeRequiredException.class);
        assertThat(queries.listPosts(criteria(false))).isEmpty();
        assertThat(queries.listPosts(criteria(true))).extracting(post -> post.id()).contains(created.id());

        var edit = InterviewPostRequestParser.parseUpdate(mapper.createObjectNode().put("schedule_note", "준비물은 없어요."));
        assertThatThrownBy(() -> writes.updatePost(outsider, created.id(), edit)).isInstanceOf(HypofitException.class);
        writes.updatePost(owner, created.id(), edit);
        assertThat(repository.findPost(created.id()).orElseThrow().creationConfiguration().scheduleNote()).isEqualTo("준비물은 없어요.");
        assertThatThrownBy(() -> writes.updatePost(owner, created.id(), InterviewPostRequestParser.parseUpdate(
                mapper.createObjectNode().put("entry_mode", "direct"))))
                .isInstanceOf(HypofitValidationException.class);

        assertThatThrownBy(() -> applications.createApplication(owner, created.id(), Map.of(), List.of()))
                .isInstanceOf(HypofitException.class);
        var application = applications.createApplication(participant, created.id(), Map.of("motivation", "연구에 참여하고 싶어요."), List.of());
        assertThat(chats.listRooms(participant)).isEmpty();
        assertThatThrownBy(() -> applications.updateApplicationStatus(outsider, application.id(), "selected", null))
                .isInstanceOf(HypofitException.class);
        applications.updateApplicationStatus(owner, application.id(), "selected", null);
        var rooms = chats.listRooms(participant);
        assertThat(rooms).hasSize(1);
        UUID roomId = rooms.getFirst().id();
        var workflow = chats.getRoomWorkflow(owner, roomId);
        assertThat(workflow.primaryAction()).isNull();
        assertThat(workflow.secondaryAction()).isNull();
        assertThat(workflow.session()).isNull();
        assertThat(workflow.description()).contains("연구 일정", "준비 사항");
        chats.sendMessage(participant, roomId, "안내된 시간에 참여할 수 있어요.", UUID.randomUUID().toString());
        assertThatThrownBy(() -> chats.getRoom(outsider, roomId)).isInstanceOf(ResponseStatusException.class);
        assertThat(jdbcTemplate.queryForObject("select count(*) from interview_sessions where application_id = ?",
                Integer.class, application.id())).isZero();
        var second = applications.createApplication(outsider, created.id(), Map.of(), List.of());
        assertThatThrownBy(() -> applications.updateApplicationStatus(owner, second.id(), "selected", null))
                .isInstanceOf(HypofitException.class);

        properties.setResearchRecruitmentCreationEnabled(false);
        try {
            assertThat(writes.enabledRecruitmentTypesForCreation()).doesNotContain("research_experiment");
            assertThatThrownBy(() -> writes.createPost(owner, command)).isInstanceOf(InterviewPostRecruitmentTypeNotSupportedException.class);
            writes.updatePost(owner, created.id(), InterviewPostRequestParser.parseUpdate(
                    mapper.createObjectNode().put("title", "기존 연구 공고 수정")));
            assertThat(queries.getVisiblePost(created.id(), null, false, true, true).title()).isEqualTo("기존 연구 공고 수정");
            assertThat(chats.getRoom(participant, roomId).applicationId()).isEqualTo(application.id());
            applications.withdrawApplication(participant, application.id());
            assertThat(chats.getRoomWorkflow(owner, roomId).primaryAction()).isNull();
            assertThatThrownBy(() -> chats.sendMessage(participant, roomId, "철회 후 메시지", UUID.randomUUID().toString()))
                    .isInstanceOf(ResponseStatusException.class);
        } finally {
            properties.setResearchRecruitmentCreationEnabled(true);
        }

        writes.updatePost(owner, created.id(), InterviewPostRequestParser.parseUpdate(mapper.createObjectNode().put("interview_mode", "online")));
        var online = repository.findPost(created.id()).orElseThrow();
        assertThat(online.locationLatitude()).isNull();
        assertThat(online.locationText()).isNull();
        assertThat(jdbcTemplate.queryForObject("select location_point is null from interview_posts where id = ?",
                Boolean.class, created.id())).isTrue();
        assertThat(online.creationConfiguration().scheduleMode()).isEqualTo("fixed");
    }

    @ParameterizedTest
    @ValueSource(strings = {"location", "location_text"})
    void acceptsEitherLocationTextAlias(String omitted) throws Exception {
        var body = payload("offline");
        body.remove(omitted);
        var created = writes.createPost(user(), InterviewPostRequestParser.parseCreate(body));
        assertThat(repository.findPost(created.id()).orElseThrow().locationText()).isEqualTo("안산 연구 공간");
    }

    @ParameterizedTest
    @ValueSource(strings = {"recurring", "negotiated"})
    void preservesRecurringAndNegotiatedSchedulesWithoutDuplicatingPreparation(String mode) throws Exception {
        var body = payload("online").put("schedule_mode", mode);
        body.putArray("schedule_fixed_slots");
        body.putArray("schedule_options");
        var windows = body.putArray("schedule_recurring_windows");
        if ("recurring".equals(mode)) {
            windows.add("평일 저녁").add("주말 오후");
            body.putArray("schedule_options").add("평일 저녁").add("주말 오후");
        }
        var created = writes.createPost(user(), InterviewPostRequestParser.parseCreate(body));
        var detail = InterviewPostResponse.from(queries.getVisiblePost(created.id(), null, false, true, true));
        assertThat(detail.scheduleMode()).isEqualTo(mode);
        assertThat(detail.scheduleFixedSlots()).isEmpty();
        assertThat(detail.scheduleRecurringWindows()).containsExactlyElementsOf(
                "recurring".equals(mode) ? List.of("평일 저녁", "주말 오후") : List.of());
        assertThat(detail.scheduleNote()).isEqualTo(body.get("schedule_note").asText());
    }

    @ParameterizedTest
    @ValueSource(strings = {"entry_mode", "schedule_mode", "schedule_fixed_slots", "schedule_recurring_windows", "duration_value", "location"})
    void invalidResearchFieldsFailWithoutCreatingPosts(String field) throws Exception {
        var body = payload("offline");
        switch (field) {
            case "entry_mode" -> body.put(field, "direct");
            case "schedule_mode" -> body.put(field, "none");
            case "schedule_fixed_slots" -> body.putArray(field);
            case "schedule_recurring_windows" -> {
                body.put("schedule_mode", "recurring");
                body.putArray(field);
            }
            case "duration_value" -> body.put(field, 5);
            case "location" -> {
                body.remove("location");
                body.remove("location_text");
            }
            default -> throw new IllegalArgumentException(field);
        }
        UUID owner = user();
        assertThatThrownBy(() -> writes.createPost(owner, InterviewPostRequestParser.parseCreate(body)))
                .isInstanceOfSatisfying(HypofitValidationException.class, error ->
                        assertThat(error.getFieldErrors()).extracting(item -> item.field()).contains(field));
        assertThat(jdbcTemplate.queryForObject("select count(*) from interview_posts", Integer.class)).isZero();
    }

    @Test
    void discardedTypesStayDisabledEvenWithResearchAndLegacyExtendedFlagsEnabled() throws Exception {
        properties.setExtendedRecruitmentCreationEnabled(true);
        try {
            assertThat(writes.enabledRecruitmentTypesForCreation()).contains("research_experiment")
                    .doesNotContain("usability_test", "other", "focus_group");
            for (String type : List.of("usability_test", "other", "focus_group")) {
                UUID owner = user();
                var body = payload("online").put("recruitment_type", type);
                assertThatThrownBy(() -> writes.createPost(owner, InterviewPostRequestParser.parseCreate(body)))
                        .isInstanceOf(InterviewPostRecruitmentTypeNotSupportedException.class);
            }
        } finally {
            properties.setExtendedRecruitmentCreationEnabled(false);
        }
    }

    private InterviewPostListCriteria criteria(boolean research) {
        return new InterviewPostListCriteria("open", null, false, true, null, null, null,
                null, null, null, null, null, "newest", 100, research);
    }

    private ObjectNode payload(String mode) throws Exception {
        return (ObjectNode) mapper.readTree("""
                {
                  "recruitment_type":"research_experiment", "entry_mode":"application_required",
                  "title":"성인 시각 과제 연구 참여자 모집",
                  "service_summary":"화면의 도형을 구분하는 과제를 수행합니다. 연구 절차는 모집자가 별도로 안내합니다.",
                  "target_description":"60분 동안 과제에 참여할 수 있는 성인",
                  "reward_amount":0, "compensations":[{"type":"gift_card","label":"커피 기프티콘"}],
                  "duration_minutes":60, "duration_value":1, "duration_unit":"hours",
                  "recruit_count":1, "recruitment_limit_mode":"limited",
                  "interview_mode":"%s", "location":"안산 연구 공간", "location_text":"안산 연구 공간",
                  "location_latitude":37.3, "location_longitude":126.8, "location_precision":"exact", "location_source":"kakao_place",
                  "schedule_mode":"fixed", "schedule_fixed_slots":["2099-09-15T10:00:00+09:00"],
                  "schedule_options":["2099-09-15T10:00:00+09:00"],
                  "schedule_note":"개인 노트북을 준비해 주세요.\\n도착 후 담당자에게 연락해 주세요.", "status":"open"
                }
                """.formatted(mode));
    }

    private UUID user() {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("insert into app_users (id, email, name, role) values (?, ?, ?, ?)",
                id, id + "@example.com", "연구 모집 테스트", "both");
        return id;
    }
}
