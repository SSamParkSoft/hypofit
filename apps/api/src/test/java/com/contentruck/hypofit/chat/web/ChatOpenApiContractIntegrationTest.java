package com.contentruck.hypofit.chat.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Iterator;
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
class ChatOpenApiContractIntegrationTest {

    private static final List<String> CHAT_MESSAGE_TYPES = List.of(
            "application_created",
            "application_rejected",
            "application_selected",
            "schedule_created",
            "system",
            "user"
    );

    private static final List<String> CHAT_WORKFLOW_STEPS = List.of(
            "application_review",
            "attendance_confirmation_needed",
            "attendance_counterpart_pending",
            "closed",
            "completed",
            "problem_reported",
            "review_needed",
            "reward_confirmation_needed",
            "reward_confirmed",
            "reward_payment_needed",
            "schedule_needed",
            "scheduled",
            "selected"
    );

    private static final List<String> CHAT_WORKFLOW_ACTIONS = List.of(
            "confirm_attendance",
            "confirm_reward_received",
            "create_schedule",
            "dispute_reward",
            "mark_no_show",
            "mark_reward_paid",
            "open_application_answers",
            "open_support_report",
            "reject_application",
            "select_application",
            "write_review"
    );

    private static final List<String> CHAT_WORKFLOW_TONES = List.of("default", "primary", "danger");

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
    void chatRequestSchemasMatchFastApiContractShape() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        JsonNode messageCreate = root.at("/components/schemas/ChatMessageCreateRequest");
        assertThat(messageCreate.at("/properties/body/type").asText()).isEqualTo("string");
        assertThat(messageCreate.at("/properties/body/minLength").asInt()).isEqualTo(1);
        assertThat(messageCreate.at("/properties/body/maxLength").asInt()).isEqualTo(2000);
        assertThat(isNullableString(messageCreate.at("/properties/client_message_id"), null)).isTrue();
        assertThat(messageCreate.at("/properties/client_message_id").has("minLength")).isFalse();
        assertThat(messageCreate.at("/properties/client_message_id/maxLength").asInt()).isEqualTo(80);

        JsonNode readUpdate = root.at("/components/schemas/ChatRoomReadUpdate");
        assertThat(isNullableString(readUpdate.at("/properties/last_read_message_id"), "uuid")).isTrue();

        JsonNode settingsUpdate = root.at("/components/schemas/ChatRoomSettingsUpdateRequest");
        assertThat(isNullableBoolean(settingsUpdate.at("/properties/is_hidden"))).isTrue();
        assertThat(isNullableBoolean(settingsUpdate.at("/properties/is_muted"))).isTrue();

        JsonNode messagesBefore = findParameterSchema(root, "/api/v1/chat/rooms/{room_id}/messages", "get", "before");
        assertThat(isNullableString(messagesBefore, "date-time")).isTrue();

        JsonNode messagesBeforeId = findParameterSchema(root, "/api/v1/chat/rooms/{room_id}/messages", "get", "before_id");
        assertThat(isNullableString(messagesBeforeId, "uuid")).isTrue();

        JsonNode messagesLimit = findParameterSchema(root, "/api/v1/chat/rooms/{room_id}/messages", "get", "limit");
        assertThat(messagesLimit.at("/type").asText()).isEqualTo("integer");
        assertThat(messagesLimit.at("/minimum").decimalValue()).isEqualByComparingTo("1");
        assertThat(messagesLimit.at("/maximum").decimalValue()).isEqualByComparingTo("100");
        assertThat(messagesLimit.at("/default").asInt()).isEqualTo(50);
        assertThat(messagesLimit.has("format")).isFalse();
    }

    @Test
    void chatResponseSchemasMatchFastApiContractShape() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertEnum(
                root,
                "/components/schemas/ChatMessageResponse/properties/message_type/enum",
                CHAT_MESSAGE_TYPES
        );

        assertEnum(
                root,
                "/components/schemas/ChatWorkflowResponse/properties/step/enum",
                CHAT_WORKFLOW_STEPS
        );
        assertDefault(
                root,
                "/components/schemas/ChatWorkflowResponse/properties/counterpart_review_submitted/default",
                false
        );

        String actionSchemaBase = "/components/schemas/ChatWorkflowActionResponse/properties";
        assertEnum(root, actionSchemaBase + "/action/enum", CHAT_WORKFLOW_ACTIONS);
        assertEnum(root, actionSchemaBase + "/tone/enum", CHAT_WORKFLOW_TONES);
        assertDefault(root, actionSchemaBase + "/tone/default", "default");

        String roomSchemaBase = "/components/schemas/ChatRoomResponse/properties";
        assertEnum(root, roomSchemaBase + "/status/enum", List.of("open", "selected", "closed", "blocked"));
        assertDefault(root, roomSchemaBase + "/unread_count/default", 0);
        assertNoFormat(root, roomSchemaBase + "/unread_count");
        assertDefault(root, roomSchemaBase + "/is_muted/default", false);
        assertDefault(root, roomSchemaBase + "/is_hidden/default", false);

        String interviewPostBase = "/components/schemas/ChatInterviewPostResponse/properties";
        assertLengthRange(root, interviewPostBase + "/service_summary", 10, 2000);
        assertLengthRange(root, interviewPostBase + "/target_description", 10, 2000);
        assertMinimum(root, interviewPostBase + "/reward_amount", "0");
        assertNoFormat(root, interviewPostBase + "/reward_amount");
        assertNumericRange(root, interviewPostBase + "/duration_minutes", "10", "240");
        assertNoFormat(root, interviewPostBase + "/duration_minutes");
        assertDefault(root, interviewPostBase + "/recruit_count/default", 0);
        assertNumericRange(root, interviewPostBase + "/recruit_count", "0", "999");
        assertNoFormat(root, interviewPostBase + "/recruit_count");
        assertEnum(root, interviewPostBase + "/interview_mode/enum", List.of("both", "offline", "online"));
        assertMaxLength(root, interviewPostBase + "/location_text/maxLength", 200);
        assertMaxLength(root, interviewPostBase + "/location_address/maxLength", 300);
        assertMaxLength(root, interviewPostBase + "/location_place_name/maxLength", 200);
        assertMinimum(root, interviewPostBase + "/location_latitude", "-90");
        assertMaximum(root, interviewPostBase + "/location_latitude", "90");
        assertNoFormat(root, interviewPostBase + "/location_latitude");
        assertMinimum(root, interviewPostBase + "/location_longitude", "-180");
        assertMaximum(root, interviewPostBase + "/location_longitude", "180");
        assertNoFormat(root, interviewPostBase + "/location_longitude");
        assertEnum(root, interviewPostBase + "/location_precision/enum", List.of("district", "exact", "nearby"));
        assertEnum(root, interviewPostBase + "/location_source/enum", List.of("current_location", "kakao_place", "manual"));
        assertEnum(
                root,
                interviewPostBase + "/status/enum",
                List.of("archived", "closed", "completed", "draft", "hidden", "open", "removed")
        );
        assertNoFormat(root, interviewPostBase + "/distance_meters");

        String founderReviewBase = "/components/schemas/ChatFounderReviewSummaryResponse/properties";
        assertNoFormat(root, founderReviewBase + "/average_rating");
        assertDefault(root, founderReviewBase + "/review_count/default", 0);
        assertNoFormat(root, founderReviewBase + "/review_count");
    }

    private static JsonNode findParameterSchema(JsonNode root, String path, String method, String parameterName) {
        JsonNode parameters = root.at("/paths/" + encodePointer(path) + "/" + method + "/parameters");
        assertThat(parameters.isArray()).isTrue();
        for (JsonNode parameter : parameters) {
            if (parameterName.equals(parameter.path("name").asText())) {
                return parameter.path("schema");
            }
        }
        throw new AssertionError("Parameter not found: " + parameterName);
    }

    private static String encodePointer(String value) {
        return value.replace("~", "~0").replace("/", "~1");
    }

    private static boolean isNullableString(JsonNode schema, String expectedFormat) {
        if (!containsType(schema, "string", "null")) {
            return false;
        }
        if (expectedFormat == null) {
            return !schema.has("format") || schema.path("format").asText().isEmpty();
        }
        return expectedFormat.equals(schema.path("format").asText());
    }

    private static boolean isNullableBoolean(JsonNode schema) {
        return containsType(schema, "boolean", "null");
    }

    private static boolean containsType(JsonNode schema, String expectedType, String expectedNull) {
        if (schema.path("type").isArray()) {
            boolean seenType = false;
            boolean seenNull = false;
            Iterator<JsonNode> iterator = schema.path("type").elements();
            while (iterator.hasNext()) {
                JsonNode node = iterator.next();
                if (expectedType.equals(node.asText())) {
                    seenType = true;
                }
                if (expectedNull.equals(node.asText())) {
                    seenNull = true;
                }
            }
            if (seenType && seenNull) {
                return true;
            }
        }
        return containsUnionType(schema.path("anyOf"), expectedType, expectedNull)
                || containsUnionType(schema.path("oneOf"), expectedType, expectedNull);
    }

    private static boolean containsUnionType(JsonNode nodes, String expectedType, String expectedNull) {
        if (!nodes.isArray()) {
            return false;
        }
        boolean seenType = false;
        boolean seenNull = false;
        Iterator<JsonNode> iterator = nodes.elements();
        while (iterator.hasNext()) {
            JsonNode node = iterator.next();
            if (expectedType.equals(node.path("type").asText())) {
                seenType = true;
            }
            if (expectedNull.equals(node.path("type").asText())) {
                seenNull = true;
            }
        }
        return seenType && seenNull;
    }

    private static void assertEnum(JsonNode root, String pointer, List<String> expectedValues) {
        JsonNode enumNode = root.at(pointer);
        assertThat(enumNode.isArray()).isTrue();
        assertThat(enumNode)
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrderElementsOf(expectedValues);
    }

    private static void assertDefault(JsonNode root, String pointer, boolean expectedValue) {
        JsonNode defaultNode = root.at(pointer);
        assertThat(defaultNode.isBoolean()).isTrue();
        assertThat(defaultNode.booleanValue()).isEqualTo(expectedValue);
    }

    private static void assertDefault(JsonNode root, String pointer, String expectedValue) {
        JsonNode defaultNode = root.at(pointer);
        assertThat(defaultNode.isTextual()).isTrue();
        assertThat(defaultNode.asText()).isEqualTo(expectedValue);
    }

    private static void assertDefault(JsonNode root, String pointer, int expectedValue) {
        JsonNode defaultNode = root.at(pointer);
        assertThat(defaultNode.isInt()).isTrue();
        assertThat(defaultNode.intValue()).isEqualTo(expectedValue);
    }

    private static void assertNoFormat(JsonNode root, String pointer) {
        JsonNode schemaNode = root.at(pointer);
        assertThat(schemaNode.has("format")).isFalse();
    }

    private static void assertLengthRange(JsonNode root, String pointer, int expectedMin, int expectedMax) {
        JsonNode schemaNode = root.at(pointer);
        assertThat(schemaNode.at("/minLength").asInt()).isEqualTo(expectedMin);
        assertThat(schemaNode.at("/maxLength").asInt()).isEqualTo(expectedMax);
    }

    private static void assertNumericRange(JsonNode root, String pointer, String expectedMin, String expectedMax) {
        JsonNode schemaNode = root.at(pointer);
        assertThat(schemaNode.at("/minimum").decimalValue()).isEqualByComparingTo(expectedMin);
        assertThat(schemaNode.at("/maximum").decimalValue()).isEqualByComparingTo(expectedMax);
    }

    private static void assertMaxLength(JsonNode root, String pointer, int expectedValue) {
        JsonNode value = root.at(pointer);
        assertThat(value.asInt()).isEqualTo(expectedValue);
    }

    private static void assertMinimum(JsonNode root, String pointer, String expectedValue) {
        JsonNode schemaNode = root.at(pointer);
        assertThat(schemaNode.at("/minimum").decimalValue()).isEqualByComparingTo(expectedValue);
    }

    private static void assertMaximum(JsonNode root, String pointer, String expectedValue) {
        JsonNode schemaNode = root.at(pointer);
        assertThat(schemaNode.at("/maximum").decimalValue()).isEqualByComparingTo(expectedValue);
    }
}
