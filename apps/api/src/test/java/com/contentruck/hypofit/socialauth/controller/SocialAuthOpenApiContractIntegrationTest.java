package com.contentruck.hypofit.socialauth.controller;


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
class SocialAuthOpenApiContractIntegrationTest {

    private static final List<String> PROVIDERS = List.of("apple", "google", "kakao", "naver");
    private static final List<String> PLATFORMS = List.of("web", "ios", "android");
    private static final List<String> FLOWS = List.of("login", "link");
    private static final List<String> IDENTITY_STATUSES = List.of("active", "revocation_pending", "revoked");
    private static final List<String> NEXT_STEPS = List.of(
            "signed_in",
            "email_required",
            "legal_consent_required",
            "role_onboarding_required",
            "profile_completion_required"
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
    void socialAuthOpenApiPreservesCompatibilitySchemaMetadata() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertAdditionalProperties(root, "/components/schemas/AppleSignInNotificationReceive", false);
        assertRequired(root, "/components/schemas/AppleSignInNotificationReceive", "payload");
        assertThat(root.at("/components/schemas/AppleSignInNotificationReceive/properties/payload/minLength").asInt()).isEqualTo(1);
        assertThat(root.at("/components/schemas/AppleSignInNotificationAccepted/properties/status/default").asText()).isEqualTo("accepted");
        assertThat(root.at("/components/schemas/AppleSignInNotificationAccepted/properties/status/const").asText()).isEqualTo("accepted");

        assertAdditionalProperties(root, "/components/schemas/SocialAuthAttemptCreate", false);
        assertRequired(root, "/components/schemas/SocialAuthAttemptCreate", "provider", "platform");
        assertEnum(root, "/components/schemas/SocialAuthAttemptCreate/properties/provider", PROVIDERS);
        assertEnum(root, "/components/schemas/SocialAuthAttemptCreate/properties/platform", PLATFORMS);
        assertEnum(root, "/components/schemas/SocialAuthAttemptCreate/properties/flow", FLOWS);
        assertThat(root.at("/components/schemas/SocialAuthAttemptCreate/properties/flow/default").asText()).isEqualTo("login");
        assertNullableType(root, "/components/schemas/SocialAuthAttemptCreate/properties/return_path", "null", "string");
        assertThat(root.at("/components/schemas/SocialAuthAttemptCreate/properties/return_path/maxLength").asInt()).isEqualTo(2048);

        assertAdditionalProperties(root, "/components/schemas/SocialAuthLinkAttemptCreate", false);
        assertRequired(root, "/components/schemas/SocialAuthLinkAttemptCreate", "provider", "platform");
        assertEnum(root, "/components/schemas/SocialAuthLinkAttemptCreate/properties/provider", PROVIDERS);
        assertEnum(root, "/components/schemas/SocialAuthLinkAttemptCreate/properties/platform", PLATFORMS);
        assertNullableType(root, "/components/schemas/SocialAuthLinkAttemptCreate/properties/return_path", "null", "string");
        assertThat(root.at("/components/schemas/SocialAuthLinkAttemptCreate/properties/return_path/maxLength").asInt()).isEqualTo(2048);

        assertAdditionalProperties(root, "/components/schemas/SocialAuthComplete", false);
        assertRequired(root, "/components/schemas/SocialAuthComplete", "attempt_id", "attempt_secret");
        assertThat(root.at("/components/schemas/SocialAuthComplete/properties/attempt_id/format").asText()).isEqualTo("uuid");
        assertThat(root.at("/components/schemas/SocialAuthComplete/properties/attempt_secret/minLength").asInt()).isEqualTo(32);
        assertThat(root.at("/components/schemas/SocialAuthComplete/properties/attempt_secret/maxLength").asInt()).isEqualTo(256);

        assertEnum(root, "/components/schemas/SocialAuthAttemptResponse/properties/provider", PROVIDERS);
        assertEnum(root, "/components/schemas/SocialAuthAttemptResponse/properties/platform", PLATFORMS);
        assertEnum(root, "/components/schemas/SocialAuthAttemptResponse/properties/flow", FLOWS);
        assertType(root, "/components/schemas/SocialAuthAttemptResponse/properties/return_path", "string");

        assertEnum(root, "/components/schemas/SocialIdentityResponse/properties/provider", PROVIDERS);
        assertType(root, "/components/schemas/SocialIdentityResponse/properties/email", "string");
        assertType(root, "/components/schemas/SocialIdentityResponse/properties/email_verified", "boolean");
        assertEnum(root, "/components/schemas/SocialIdentityResponse/properties/status", IDENTITY_STATUSES);

        assertEnum(root, "/components/schemas/SocialAuthCompleteResponse/properties/next_step", NEXT_STEPS);
        assertType(root, "/components/schemas/SocialAuthCompleteResponse/properties/return_path", "string");

        assertEnum(root, "/components/schemas/SocialIdentityReconcileResponse/properties/revoked_providers/items", PROVIDERS);
    }

    private static void assertRequired(JsonNode root, String schemaPointer, String... fieldNames) {
        JsonNode required = root.at(schemaPointer + "/required");
        assertThat(required.isArray()).isTrue();
        assertThat(required).extracting(JsonNode::asText).containsExactlyInAnyOrder(fieldNames);
    }

    private static void assertAdditionalProperties(JsonNode root, String schemaPointer, boolean expected) {
        assertThat(root.at(schemaPointer + "/additionalProperties").asBoolean()).isEqualTo(expected);
    }

    private static void assertNullableType(JsonNode root, String pointer, String... expectedTypes) {
        JsonNode typeNode = root.at(pointer + "/type");
        assertThat(typeNode.isArray()).isTrue();
        assertThat(typeNode).extracting(JsonNode::asText).containsExactly(expectedTypes);
    }

    private static void assertType(JsonNode root, String pointer, String expectedType) {
        assertThat(root.at(pointer + "/type").asText()).isEqualTo(expectedType);
    }

    private static void assertEnum(JsonNode root, String pointer, List<String> values) {
        JsonNode schema = pointer.isEmpty() ? root : root.at(pointer + "/enum");
        JsonNode enumNode = pointer.isEmpty() ? root.at("/enum") : schema;
        assertThat(enumNode.isArray()).isTrue();
        assertThat(enumNode).extracting(JsonNode::asText).containsExactlyElementsOf(values);
    }

}
