package com.contentruck.hypofit.common.web;

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
class OpenApiContractRegressionIntegrationTest {

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
    void highValueOpenApiContractsRemainCompatible() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertThat(root.at("/paths/~1api~1v1~1admin~1account-deletion-requests/get/parameters/0/name").asText())
                .isEqualTo("limit");
        assertThat(root.at("/paths/~1api~1v1~1admin~1account-deletion-requests/get/parameters/0/schema/type").asText())
                .isEqualTo("integer");

        assertNullableType(findParameterSchema(
                root, "/api/v1/admin/support/tickets", "deleted_by_user"
        ), "boolean");
        assertThat(findParameterSchema(root, "/api/v1/admin/support/tickets", "limit").at("/type").asText())
                .isEqualTo("integer");

        assertThat(root.at("/paths/~1api~1v1~1chat~1rooms~1{room_id}~1read/post/requestBody/content/application~1json/schema/anyOf/0/$ref").asText())
                .isEqualTo("#/components/schemas/ChatRoomReadUpdate");
        assertThat(root.at("/paths/~1api~1v1~1chat~1rooms~1{room_id}~1read/post/requestBody/content/application~1json/schema/anyOf/1/type").asText())
                .isEqualTo("null");
        assertThat(root.at("/components/schemas/ChatRoomReadUpdate").isObject()).isTrue();
        assertThat(root.at("/components/schemas/InterviewPostStatusUpdate/properties/status/const").asText())
                .isEqualTo("closed");

        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "q").at("/maxLength").asInt()).isEqualTo(100);
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "reward_min").at("/minimum").decimalValue())
                .isEqualByComparingTo("0");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "reward_max").at("/minimum").decimalValue())
                .isEqualByComparingTo("0");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "lat").at("/minimum").decimalValue())
                .isEqualByComparingTo("-90");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "lat").at("/maximum").decimalValue())
                .isEqualByComparingTo("90");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "lng").at("/minimum").decimalValue())
                .isEqualByComparingTo("-180");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "lng").at("/maximum").decimalValue())
                .isEqualByComparingTo("180");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "radius_m").at("/minimum").decimalValue())
                .isEqualByComparingTo("500");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "radius_m").at("/maximum").decimalValue())
                .isEqualByComparingTo("20000");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "sort").at("/pattern").asText())
                .isEqualTo("^(newest|distance|reward)$");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "limit").at("/minimum").decimalValue())
                .isEqualByComparingTo("1");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "limit").at("/maximum").decimalValue())
                .isEqualByComparingTo("100");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "founder_id"), "string");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "lat"), "number");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "lng"), "number");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "mode"), "string");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "q"), "string");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "radius_m"), "integer");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "reward_max"), "integer");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "reward_min"), "integer");
        assertNullableType(findParameterSchema(root, "/api/v1/interview-posts/", "status"), "string");
        assertThat(findParameterSchema(root, "/api/v1/interview-posts/", "limit").has("format")).isFalse();

        String interviewCreateBase = "/components/schemas/InterviewPostCreate/properties";
        assertEnum(
                root,
                interviewCreateBase + "/recruitment_type/enum",
                "interview", "survey", "beta_test", "usability_test", "research_experiment", "focus_group", "other"
        );
        assertNoFormat(root, interviewCreateBase + "/reward_amount");
        assertNoFormat(root, interviewCreateBase + "/duration_minutes");
        assertNoFormat(root, interviewCreateBase + "/recruit_count");
        assertNoFormat(root, interviewCreateBase + "/location_latitude");
        assertNoFormat(root, interviewCreateBase + "/location_longitude");

        String interviewUpdateBase = "/components/schemas/InterviewPostUpdate/properties";
        assertNoFormat(root, interviewUpdateBase + "/reward_amount");
        assertNoFormat(root, interviewUpdateBase + "/duration_minutes");
        assertNoFormat(root, interviewUpdateBase + "/recruit_count");
        assertNoFormat(root, interviewUpdateBase + "/location_latitude");
        assertNoFormat(root, interviewUpdateBase + "/location_longitude");
        assertNullableType(root.at(interviewUpdateBase + "/schedule_options"), "array");

        String interviewResponseBase = "/components/schemas/InterviewPostResponse/properties";
        assertEnum(
                root,
                interviewResponseBase + "/recruitment_type/enum",
                "interview", "survey", "beta_test", "usability_test", "research_experiment", "focus_group", "other"
        );
        assertLengthRange(root, interviewResponseBase + "/service_summary", 10, 2000);
        assertLengthRange(root, interviewResponseBase + "/target_description", 10, 2000);
        assertMinimum(root, interviewResponseBase + "/reward_amount", "0");
        assertNoFormat(root, interviewResponseBase + "/reward_amount");
        assertNumericRange(root, interviewResponseBase + "/duration_minutes", "10", "240");
        assertNoFormat(root, interviewResponseBase + "/duration_minutes");
        assertNumericRange(root, interviewResponseBase + "/recruit_count", "0", "999");
        assertDefault(root, interviewResponseBase + "/recruit_count/default", 0);
        assertNoFormat(root, interviewResponseBase + "/recruit_count");
        assertEnum(root, interviewResponseBase + "/interview_mode/enum", "both", "offline", "online");
        assertMaxLength(root, interviewResponseBase + "/location_text/maxLength", 200);
        assertMaxLength(root, interviewResponseBase + "/location_address/maxLength", 300);
        assertMaxLength(root, interviewResponseBase + "/location_place_name/maxLength", 200);
        assertNumericRange(root, interviewResponseBase + "/location_latitude", "-90", "90");
        assertNoFormat(root, interviewResponseBase + "/location_latitude");
        assertNumericRange(root, interviewResponseBase + "/location_longitude", "-180", "180");
        assertNoFormat(root, interviewResponseBase + "/location_longitude");
        assertEnum(root, interviewResponseBase + "/location_precision/enum", "district", "exact", "nearby");
        assertEnum(
                root,
                interviewResponseBase + "/location_source/enum",
                "current_location",
                "kakao_place",
                "manual"
        );
        assertEnum(
                root,
                interviewResponseBase + "/status/enum",
                "archived",
                "closed",
                "completed",
                "draft",
                "hidden",
                "open",
                "removed"
        );
        assertNoFormat(root, interviewResponseBase + "/distance_meters");
        assertSchemaContainsRef(root.at(interviewResponseBase + "/ai_summary"), "#/components/schemas/InterviewAiSummaryRead");

        String interviewAiSummaryBase = "/components/schemas/InterviewAiSummaryRead/properties";
        assertEnum(root, interviewAiSummaryBase + "/status/enum", "failed", "pending", "processing", "ready");
        assertSchemaContainsRef(root.at(interviewAiSummaryBase + "/content"), "#/components/schemas/InterviewSummaryContent");
        assertThat(root.at(interviewAiSummaryBase + "/updated_at/format").asText()).isEqualTo("date-time");

        String reviewSummaryBase = "/components/schemas/FounderReviewSummaryResponse/properties";
        assertNoFormat(root, reviewSummaryBase + "/average_rating");
        assertDefault(root, reviewSummaryBase + "/review_count/default", 0);
        assertNoFormat(root, reviewSummaryBase + "/review_count");

        String viewResponseBase = "/components/schemas/InterviewPostViewResponse/properties";
        assertNoFormat(root, viewResponseBase + "/view_count");
        assertEnum(root, viewResponseBase + "/source/enum", "chat", "detail", "home", "interviews", "map");

        assertRequestRef(root, "/api/v1/users/{user_id}/block", "post", "#/components/schemas/UserBlockCreate");
        assertRequestRef(root, "/api/v1/admin/moderation/actions", "post", "#/components/schemas/ModerationActionCreate");
        assertRequestRef(root, "/api/v1/admin/support/tickets/{ticket_id}/status", "patch", "#/components/schemas/AdminSupportTicketStatusUpdate");
        assertRequestRef(root, "/api/v1/admin/support/tickets/{ticket_id}/replies", "post", "#/components/schemas/AdminSupportTicketReplyCreate");
        assertRequestRef(root, "/api/v1/admin/notifications/test", "post", "#/components/schemas/AdminTestNotificationCreate");
        assertRequestRef(root, "/api/v1/interview-posts/", "post", "#/components/schemas/InterviewPostCreate");
        assertRequestRef(root, "/api/v1/interview-posts/{post_id}", "patch", "#/components/schemas/InterviewPostUpdate");
        assertRequestRef(root, "/api/v1/interview-posts/{post_id}/status", "patch", "#/components/schemas/InterviewPostStatusUpdate");
        assertRequestRef(root, "/api/v1/support/tickets", "post", "#/components/schemas/SupportTicketCreate");
        assertRequestRef(root, "/api/v1/support/tickets/{ticket_id}", "patch", "#/components/schemas/SupportTicketUpdate");

        JsonNode adminSupportReplies = root.at(
                "/components/schemas/AdminSupportTicketResponse/properties/replies"
        );
        assertThat(adminSupportReplies.at("/type").asText()).isEqualTo("array");
        assertThat(adminSupportReplies.at("/items/$ref").asText())
                .isEqualTo("#/components/schemas/SupportTicketReplyResponse");
        assertThat(root.at("/components/schemas/SupportTicketReplyResponse/properties/ticket_id/format").asText())
                .isEqualTo("uuid");
        assertThat(root.at("/components/schemas/SupportTicketReplyResponse/properties/created_at/format").asText())
                .isEqualTo("date-time");

        assertThat(root.at("/components/schemas/AdminMeResponse/properties/role/default").asText())
                .isEqualTo("admin");
        String adminSupportSummaryBase = "/components/schemas/AdminSupportSummaryResponse/properties";
        for (String property : new String[]{"open", "in_review", "reports_open", "account_deletion_open"}) {
            assertDefault(root, adminSupportSummaryBase + "/" + property + "/default", 0);
            assertNoFormat(root, adminSupportSummaryBase + "/" + property);
        }
        String dispatchResultBase = "/components/schemas/PushDispatchResultResponse/properties";
        for (String property : new String[]{"processed", "sent", "failed", "invalid", "skipped"}) {
            assertNoFormat(root, dispatchResultBase + "/" + property);
        }
        assertEnum(
                root,
                "/components/schemas/AdminTargetPreviewResponse/properties/target_type/enum",
                "application",
                "chat_message",
                "chat_room",
                "interview_post",
                "session",
                "user"
        );

        String placeResponseBase = "/components/schemas/PlaceSearchResponse/properties";
        assertNumericRange(root, placeResponseBase + "/latitude", "-90", "90");
        assertNoFormat(root, placeResponseBase + "/latitude");
        assertNumericRange(root, placeResponseBase + "/longitude", "-180", "180");
        assertNoFormat(root, placeResponseBase + "/longitude");
        assertThat(root.at(placeResponseBase + "/source/default").asText()).isEqualTo("kakao_place");

        JsonNode adminDeletedByUser = findParameterSchema(
                root, "/api/v1/admin/support/tickets", "deleted_by_user"
        );
        assertNullableType(adminDeletedByUser, "boolean");
        JsonNode adminSupportKind = findParameterSchema(root, "/api/v1/admin/support/tickets", "kind");
        assertNullableType(adminSupportKind, "string");
        assertThat(adminSupportKind.at("/pattern").asText())
                .isEqualTo("^(inquiry|report|privacy|account_deletion)$");
        assertThat(findParameterSchema(root, "/api/v1/admin/support/tickets", "status").at("/pattern").asText())
                .isEqualTo("^(open|in_review|resolved|closed)$");
        assertEnum(
                findParameterSchema(root, "/api/v1/admin/targets/{target_type}/{target_id}", "target_type"),
                "/enum",
                "application",
                "chat_message",
                "chat_room",
                "interview_post",
                "session",
                "user"
        );

        JsonNode placeLatitude = findParameterSchema(root, "/api/v1/places/search", "lat");
        JsonNode placeLongitude = findParameterSchema(root, "/api/v1/places/search", "lng");
        JsonNode placeRadius = findParameterSchema(root, "/api/v1/places/search", "radius_m");
        assertNullableType(placeLatitude, "number");
        assertNullableType(placeLongitude, "number");
        assertNullableType(placeRadius, "integer");
        assertThat(placeLatitude.has("format")).isFalse();
        assertThat(placeLongitude.has("format")).isFalse();
        assertThat(placeRadius.has("format")).isFalse();
        assertThat(findParameterSchema(root, "/api/v1/places/search", "limit").has("format")).isFalse();

        JsonNode supportKind = findParameterSchema(root, "/api/v1/support/tickets", "kind");
        assertNullableType(supportKind, "string");
        assertThat(supportKind.at("/pattern").asText())
                .isEqualTo("^(inquiry|report|privacy|account_deletion)$");

        assertThat(root.at("/components/schemas/SupportTicketCreate/required").isArray()).isTrue();
        assertThat(root.at("/components/schemas/SupportTicketCreate/required"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("kind", "category", "body", "contact_email");
        assertNullableStringType(root, "/components/schemas/SupportTicketCreate/properties/subject", 140, null, null);
        assertNullableStringType(root, "/components/schemas/SupportTicketCreate/properties/target_type", null, null, null);
        assertNullableStringType(root, "/components/schemas/SupportTicketCreate/properties/target_id", null, null, "uuid");
        assertThat(root.at("/components/schemas/SupportTicketCreate/properties/metadata/type").asText()).isEqualTo("object");
        assertThat(root.at("/components/schemas/SupportTicketCreate/properties/metadata/additionalProperties").asBoolean()).isTrue();

        String applicationResponseBase = "/components/schemas/ApplicationResponse/properties";
        assertSchemaContainsRef(root.at(applicationResponseBase + "/ai_summary"), "#/components/schemas/ApplicantAiSummaryRead");
        String applicantAiSummaryBase = "/components/schemas/ApplicantAiSummaryRead/properties";
        assertEnum(root, applicantAiSummaryBase + "/status/enum", "failed", "pending", "processing", "ready");
        assertSchemaContainsRef(root.at(applicantAiSummaryBase + "/content"), "#/components/schemas/ApplicantSummaryContent");
        assertThat(root.at(applicantAiSummaryBase + "/updated_at/format").asText()).isEqualTo("date-time");

        assertThat(root.at("/components/schemas/SupportTicketUpdate/required").isMissingNode()).isTrue();
        assertNullableStringType(root, "/components/schemas/SupportTicketUpdate/properties/category", null, null, null);
        assertNullableStringType(root, "/components/schemas/SupportTicketUpdate/properties/subject", 140, null, null);
        assertNullableStringType(root, "/components/schemas/SupportTicketUpdate/properties/body", 2000, 5, null);
        assertNullableStringType(root, "/components/schemas/SupportTicketUpdate/properties/contact_email", 320, 5, null);
    }

    private static void assertRequestRef(JsonNode root, String path, String method, String expectedRef) {
        String pointer = "/paths/" + encodePointer(path) + "/" + method + "/requestBody/content/application~1json/schema/$ref";
        assertThat(root.at(pointer).asText()).isEqualTo(expectedRef);
    }

    private static void assertSchemaContainsRef(JsonNode schemaNode, String expectedRef) {
        if (expectedRef.equals(schemaNode.at("/$ref").asText())) {
            return;
        }
        for (String unionKey : List.of("anyOf", "oneOf", "allOf")) {
            JsonNode union = schemaNode.get(unionKey);
            if (union == null || !union.isArray()) {
                continue;
            }
            for (JsonNode node : union) {
                if (expectedRef.equals(node.at("/$ref").asText())) {
                    return;
                }
            }
        }
        assertThat(schemaNode.toString()).contains(expectedRef);
    }

    private static JsonNode findParameterSchema(JsonNode root, String path, String parameterName) {
        JsonNode parameters = root.at("/paths/" + encodePointer(path) + "/get/parameters");
        assertThat(parameters.isArray()).isTrue();
        for (JsonNode parameter : parameters) {
            if (parameterName.equals(parameter.path("name").asText())) {
                return parameter.path("schema");
            }
        }
        throw new AssertionError("Parameter not found: " + parameterName);
    }

    private static void assertNullableStringType(
            JsonNode root,
            String pointer,
            Integer maxLength,
            Integer minLength,
            String format
    ) {
        JsonNode schema = root.at(pointer);
        assertThat(schema.at("/type").isArray()).isTrue();
        assertThat(schema.at("/type")).extracting(JsonNode::asText).containsExactly("null", "string");
        if (maxLength != null) {
            assertThat(schema.at("/maxLength").asInt()).isEqualTo(maxLength);
        }
        if (minLength != null) {
            assertThat(schema.at("/minLength").asInt()).isEqualTo(minLength);
        }
        if (format != null) {
            assertThat(schema.at("/format").asText()).isEqualTo(format);
        }
    }

    private static void assertEnum(JsonNode root, String pointer, String... expectedValues) {
        JsonNode enumNode = root.at(pointer);
        assertThat(enumNode.isArray()).isTrue();
        assertThat(enumNode).extracting(JsonNode::asText).containsExactlyInAnyOrder(expectedValues);
    }

    private static void assertDefault(JsonNode root, String pointer, int expectedValue) {
        JsonNode defaultNode = root.at(pointer);
        assertThat(defaultNode.isInt()).isTrue();
        assertThat(defaultNode.intValue()).isEqualTo(expectedValue);
    }

    private static void assertNullableType(JsonNode schema, String concreteType) {
        assertThat(schema.at("/type").isArray()).isTrue();
        assertThat(schema.at("/type"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder(concreteType, "null");
    }

    private static void assertNoFormat(JsonNode root, String pointer) {
        assertThat(root.at(pointer).has("format")).isFalse();
    }

    private static void assertLengthRange(JsonNode root, String pointer, int expectedMin, int expectedMax) {
        JsonNode schema = root.at(pointer);
        assertThat(schema.at("/minLength").asInt()).isEqualTo(expectedMin);
        assertThat(schema.at("/maxLength").asInt()).isEqualTo(expectedMax);
    }

    private static void assertNumericRange(JsonNode root, String pointer, String expectedMin, String expectedMax) {
        JsonNode schema = root.at(pointer);
        assertThat(schema.at("/minimum").decimalValue()).isEqualByComparingTo(expectedMin);
        assertThat(schema.at("/maximum").decimalValue()).isEqualByComparingTo(expectedMax);
    }

    private static void assertMinimum(JsonNode root, String pointer, String expectedValue) {
        assertThat(root.at(pointer).at("/minimum").decimalValue()).isEqualByComparingTo(expectedValue);
    }

    private static void assertMaxLength(JsonNode root, String pointer, int expectedValue) {
        assertThat(root.at(pointer).asInt()).isEqualTo(expectedValue);
    }

    private static String encodePointer(String value) {
        return value.replace("~", "~0").replace("/", "~1");
    }
}
