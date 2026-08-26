package com.contentruck.hypofit.user.controller;

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
class MeOpenApiContractIntegrationTest {

    private static final List<String> USER_ROLES = List.of("both", "founder", "respondent");

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
    void meOpenApiPreservesCompatibilityRequestMetadata() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertThat(root.at("/paths/~1api~1v1~1me/patch/requestBody/content/application~1json/schema/$ref").asText())
                .isEqualTo("#/components/schemas/UserUpdateRequest");
        String patchBase = "/components/schemas/UserUpdateRequest";
        assertRequired(root, patchBase, "name");
        assertThat(root.at(patchBase + "/properties/name/minLength").asInt()).isEqualTo(1);
        assertThat(root.at(patchBase + "/properties/name/maxLength").asInt()).isEqualTo(100);
        assertNullableStringType(root, patchBase + "/properties/bio", 120);
        assertNullableStringType(root, patchBase + "/properties/phone", 40);
        assertNullableStringType(root, patchBase + "/properties/profile_image_path", 500);
        assertNullableStringType(root, patchBase + "/properties/profile_image_url", 1000);
        assertEnum(root, patchBase + "/properties/role", USER_ROLES);

        assertThat(root.at("/paths/~1api~1v1~1me~1sync/post/requestBody/content/application~1json/schema/$ref").asText())
                .isEqualTo("#/components/schemas/UserSyncRequest");
        String syncBase = "/components/schemas/UserSyncRequest";
        assertRequired(root, syncBase, "name");
        assertThat(root.at(syncBase + "/properties/name/minLength").asInt()).isEqualTo(1);
        assertThat(root.at(syncBase + "/properties/name/maxLength").asInt()).isEqualTo(100);
        assertNullableStringType(root, syncBase + "/properties/bio", 120);
        assertNullableStringType(root, syncBase + "/properties/phone", 40);
        assertNullableStringType(root, syncBase + "/properties/profile_image_path", 500);
        assertNullableStringType(root, syncBase + "/properties/profile_image_url", 1000);
        assertEnum(root, syncBase + "/properties/role", USER_ROLES);
        assertThat(root.at(syncBase + "/properties/role/default").asText()).isEqualTo("both");
    }

    private static void assertRequired(JsonNode root, String pointer, String... fieldNames) {
        JsonNode required = root.at(pointer + "/required");
        assertThat(required.isArray()).isTrue();
        assertThat(required).extracting(JsonNode::asText).containsExactlyInAnyOrder(fieldNames);
    }

    private static void assertNullableStringType(JsonNode root, String pointer, int maxLength) {
        JsonNode schema = root.at(pointer);
        assertThat(schema.at("/type").isArray()).isTrue();
        assertThat(schema.at("/type")).extracting(JsonNode::asText).containsExactly("null", "string");
        assertThat(schema.at("/maxLength").asInt()).isEqualTo(maxLength);
    }

    private static void assertEnum(JsonNode root, String pointer, List<String> values) {
        JsonNode schema = root.at(pointer + "/enum");
        assertThat(schema.isArray()).isTrue();
        assertThat(schema).extracting(JsonNode::asText).containsExactlyElementsOf(values);
    }
}
