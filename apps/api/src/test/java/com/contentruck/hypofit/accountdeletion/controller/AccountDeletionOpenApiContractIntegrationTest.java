package com.contentruck.hypofit.accountdeletion.controller;

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
class AccountDeletionOpenApiContractIntegrationTest {

    private static final List<String> ACCOUNT_DELETION_STATUSES = List.of(
            "requested",
            "verified",
            "in_review",
            "completed",
            "rejected",
            "canceled"
    );

    private static final List<String> ADMIN_VERIFICATION_STATUSES = List.of(
            "not_required",
            "awaiting_verification",
            "verified",
            "closed_without_verification"
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
    void accountDeletionOpenApiPreservesCompatibilitySchemaMetadata() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertThat(root.at("/components/schemas/AuthenticatedCreateRequest/required").isMissingNode()).isTrue();
        assertNullableStringType(root, "/components/schemas/AuthenticatedCreateRequest/properties/reason", 1000, null, null);

        assertRequired(root, "/components/schemas/PublicCreateRequest", "email");
        assertThat(root.at("/components/schemas/PublicCreateRequest/properties/email/minLength").asInt()).isEqualTo(5);
        assertThat(root.at("/components/schemas/PublicCreateRequest/properties/email/maxLength").asInt()).isEqualTo(320);
        assertNullableStringType(root, "/components/schemas/PublicCreateRequest/properties/requester_name", 100, null, null);
        assertNullableStringType(root, "/components/schemas/PublicCreateRequest/properties/reason", 1000, null, null);

        assertRequired(root, "/components/schemas/ResendRequest", "request_id");
        assertThat(root.at("/components/schemas/ResendRequest/properties/request_id/format").asText()).isEqualTo("uuid");

        assertRequired(root, "/components/schemas/VerifyRequest", "request_id");
        assertThat(root.at("/components/schemas/VerifyRequest/properties/request_id/format").asText()).isEqualTo("uuid");
        assertNullableStringType(root, "/components/schemas/VerifyRequest/properties/code", null, null, null);
        assertThat(root.at("/components/schemas/VerifyRequest/properties/code/pattern").asText()).isEqualTo("^\\d{6}$");
        assertNullableStringType(root, "/components/schemas/VerifyRequest/properties/token", 500, 8, null);

        assertRequired(root, "/components/schemas/ConfirmRequest", "confirm", "deletion_authorization", "request_id");
        assertThat(root.at("/components/schemas/ConfirmRequest/properties/confirm/const").asBoolean()).isTrue();
        assertThat(root.at("/components/schemas/ConfirmRequest/properties/request_id/format").asText()).isEqualTo("uuid");
        assertThat(root.at("/components/schemas/ConfirmRequest/properties/deletion_authorization/minLength").asInt()).isEqualTo(32);
        assertThat(root.at("/components/schemas/ConfirmRequest/properties/deletion_authorization/maxLength").asInt()).isEqualTo(500);

        assertEnum(root, "/components/schemas/AccountDeletionRequestResponse/properties/status", ACCOUNT_DELETION_STATUSES);
        assertEnum(root, "/components/schemas/PublicAccountDeletionRequestResponse/properties/status", ACCOUNT_DELETION_STATUSES);
        assertEnum(root, "/components/schemas/AdminAccountDeletionRequestResponse/properties/status", ACCOUNT_DELETION_STATUSES);
        assertEnum(
                root,
                "/components/schemas/AdminAccountDeletionRequestResponse/properties/verification_status",
                ADMIN_VERIFICATION_STATUSES
        );
        assertThat(root.at("/components/schemas/AdminAccountDeletionRequestResponse/properties/auth_cleanup_retry_available/default").asBoolean())
                .isFalse();

        JsonNode statusSchema = findParameterSchema(root, "/api/v1/admin/account-deletion-requests", "get", "status");
        assertThat(statusSchema.at("/type").isArray()).isTrue();
        assertThat(statusSchema.at("/type")).extracting(JsonNode::asText).containsExactly("null", "string");
        assertThat(statusSchema.at("/pattern").asText())
                .isEqualTo("^(requested|verified|in_review|completed|rejected|canceled)$");

        JsonNode requestIdSchema = findParameterSchema(
                root,
                "/api/v1/admin/account-deletion-requests/{request_id}/retry-auth-cleanup",
                "post",
                "request_id"
        );
        assertThat(requestIdSchema.at("/format").asText()).isEqualTo("uuid");
    }

    private static void assertRequired(JsonNode root, String schemaPointer, String... fieldNames) {
        JsonNode required = root.at(schemaPointer + "/required");
        assertThat(required.isArray()).isTrue();
        assertThat(required).extracting(JsonNode::asText).containsExactlyInAnyOrder(fieldNames);
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

    private static void assertEnum(JsonNode root, String pointer, List<String> values) {
        JsonNode schema = root.at(pointer + "/enum");
        assertThat(schema.isArray()).isTrue();
        assertThat(schema).extracting(JsonNode::asText).containsExactlyElementsOf(values);
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
}
