package com.contentruck.hypofit.session.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest(
        classes = HypofitApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.database-url=postgresql://postgres:postgres@127.0.0.1:5432/hypofit",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated"
        }
)
class SessionOpenApiContractIntegrationTest {

    private static final List<String> MEETING_TYPES = List.of("offline", "online");
    private static final List<String> NO_SHOW_PARTIES = List.of("founder", "respondent");
    private static final List<String> REVIEWER_ROLES = List.of("founder", "respondent");
    private static final List<String> REWARD_STATUSES = List.of(
            "canceled",
            "disputed",
            "founder_marked_paid",
            "pending",
            "respondent_confirmed"
    );

    @Autowired
    private WebApplicationContext applicationContext;

    @Autowired
    private RequestIdFilter requestIdFilter;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(applicationContext)
                .addFilters(requestIdFilter)
                .apply(springSecurity())
                .build();
    }

    @Test
    void sessionOpenApiPreservesCompatibilitySchemaMetadata() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertEnum(root, "/components/schemas/CreateSessionRequest/properties/meeting_type", MEETING_TYPES);
        assertNoText(root, "/components/schemas/CreateSessionRequest/properties/meeting_type/pattern");
        assertThat(root.at("/components/schemas/CreateSessionRequest/properties/meeting_type/minLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/CreateSessionRequest/properties/meeting_url", "null", "string");
        assertThat(root.at("/components/schemas/CreateSessionRequest/properties/meeting_url/minLength").isMissingNode()).isTrue();
        assertThat(root.at("/components/schemas/CreateSessionRequest/properties/meeting_url/maxLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/CreateSessionRequest/properties/place", "null", "string");
        assertThat(root.at("/components/schemas/CreateSessionRequest/properties/place/minLength").isMissingNode()).isTrue();
        assertThat(root.at("/components/schemas/CreateSessionRequest/properties/place/maxLength").isMissingNode()).isTrue();

        assertEnum(root, "/components/schemas/UpdateSessionRequest/properties/meeting_type", MEETING_TYPES);
        assertNullableType(root, "/components/schemas/UpdateSessionRequest/properties/meeting_type", "null", "string");
        assertNoText(root, "/components/schemas/UpdateSessionRequest/properties/meeting_type/pattern");
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/meeting_type/minLength").isMissingNode()).isTrue();
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/meeting_type/maxLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/UpdateSessionRequest/properties/scheduled_at", "null", "string");
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/scheduled_at/format").asText()).isEqualTo("date-time");
        assertNullableType(root, "/components/schemas/UpdateSessionRequest/properties/meeting_url", "null", "string");
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/meeting_url/minLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/UpdateSessionRequest/properties/place", "null", "string");
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/place/minLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/UpdateSessionRequest/properties/reason", "null", "string");
        assertThat(root.at("/components/schemas/UpdateSessionRequest/properties/reason/minLength").isMissingNode()).isTrue();

        assertNullableType(root, "/components/schemas/CancelSessionRequest/properties/reason", "null", "string");
        assertThat(root.at("/components/schemas/CancelSessionRequest/properties/reason/minLength").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/RewardDisputeRequest/properties/reason", "null", "string");
        assertThat(root.at("/components/schemas/RewardDisputeRequest/properties/reason/minLength").isMissingNode()).isTrue();
        assertEnum(root, "/components/schemas/NoShowRequest/properties/no_show_party", NO_SHOW_PARTIES);
        assertNullableType(root, "/components/schemas/NoShowRequest/properties/no_show_party", "null", "string");
        assertNoText(root, "/components/schemas/NoShowRequest/properties/no_show_party/pattern");

        assertThat(root.at("/components/schemas/ReviewCreateRequest/required").isArray()).isTrue();
        assertThat(root.at("/components/schemas/ReviewCreateRequest/required"))
                .extracting(JsonNode::asText)
                .containsExactly("rating");
        assertThat(root.at("/components/schemas/ReviewCreateRequest/properties/rating/format").isMissingNode()).isTrue();
        assertThat(root.at("/components/schemas/ReviewCreateRequest/properties/tags/minItems").isMissingNode()).isTrue();
        assertNullableType(root, "/components/schemas/ReviewCreateRequest/properties/comment", "null", "string");
        assertThat(root.at("/components/schemas/ReviewCreateRequest/properties/comment/minLength").isMissingNode()).isTrue();

        assertEnum(root, "/components/schemas/InterviewSessionResponse/properties/meeting_type", MEETING_TYPES);
        assertThat(root.at("/components/schemas/AttendanceRecordResponse/properties/no_show_party/enum").isMissingNode()).isTrue();
        assertEnum(root, "/components/schemas/RewardConfirmationResponse/properties/status", REWARD_STATUSES);
        assertThat(root.at("/components/schemas/RewardConfirmationResponse/properties/amount/format").isMissingNode()).isTrue();
        assertEnum(root, "/components/schemas/InterviewReviewResponse/properties/reviewer_role", REVIEWER_ROLES);
        assertThat(root.at("/components/schemas/InterviewReviewResponse/properties/rating/format").isMissingNode()).isTrue();

        assertEnum(root, "/components/schemas/ChatWorkflowSessionResponse/properties/meeting_type", MEETING_TYPES);
        assertThat(root.at("/components/schemas/ChatWorkflowAttendanceResponse/properties/no_show_party/enum").isMissingNode()).isTrue();
        assertEnum(root, "/components/schemas/ChatWorkflowRewardResponse/properties/status", REWARD_STATUSES);
        assertThat(root.at("/components/schemas/ChatWorkflowRewardResponse/properties/amount/format").isMissingNode()).isTrue();
        assertEnum(root, "/components/schemas/ChatWorkflowReviewResponse/properties/reviewer_role", REVIEWER_ROLES);
        assertThat(root.at("/components/schemas/ChatWorkflowReviewResponse/properties/rating/format").isMissingNode()).isTrue();
    }

    private static void assertNullableType(JsonNode root, String pointer, String... expectedTypes) {
        JsonNode typeNode = root.at(pointer + "/type");
        assertThat(typeNode.isArray()).isTrue();
        assertThat(typeNode).extracting(JsonNode::asText).containsExactly(expectedTypes);
    }

    private static void assertEnum(JsonNode root, String pointer, List<String> values) {
        JsonNode enumNode = root.at(pointer + "/enum");
        assertThat(enumNode.isArray()).isTrue();
        assertThat(enumNode).extracting(JsonNode::asText).containsExactlyElementsOf(values);
    }

    private static void assertNoText(JsonNode root, String pointer) {
        JsonNode node = root.at(pointer);
        assertThat(node.isMissingNode() || node.asText().isBlank()).isTrue();
    }
}
