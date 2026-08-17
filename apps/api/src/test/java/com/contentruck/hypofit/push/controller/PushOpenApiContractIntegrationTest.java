package com.contentruck.hypofit.push.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Iterator;
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
class PushOpenApiContractIntegrationTest {

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
    void pushRequestSchemasMatchCompatibilityContractShape() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertRequestRef(root, "/api/v1/push-devices", "post", "#/components/schemas/PushDeviceRegister");
        assertRequestRef(
                root,
                "/api/v1/notification-preferences",
                "patch",
                "#/components/schemas/NotificationPreferenceUpdate"
        );

        JsonNode pushSchema = root.at("/components/schemas/PushDeviceRegister");
        assertThat(pushSchema.at("/required"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("platform", "provider", "token");
        assertThat(pushSchema.at("/properties/platform").has("enum")).isFalse();
        assertThat(pushSchema.at("/properties/provider").has("enum")).isFalse();
        assertThat(pushSchema.at("/properties/environment/default").asText()).isEqualTo("production");
        assertThat(pushSchema.at("/properties/environment").has("enum")).isFalse();
        assertThat(pushSchema.at("/properties/token/minLength").asInt()).isEqualTo(10);
        assertThat(pushSchema.at("/properties/token/maxLength").asInt()).isEqualTo(4096);
        assertThat(pushSchema.at("/properties/permission_status/default").asText()).isEqualTo("granted");
        assertThat(pushSchema.at("/properties/permission_status").has("enum")).isFalse();

        JsonNode preferenceSchema = root.at("/components/schemas/NotificationPreferenceUpdate");
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/push_enabled"))).isTrue();
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/chat_push_enabled"))).isTrue();
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/application_push_enabled"))).isTrue();
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/session_push_enabled"))).isTrue();
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/support_push_enabled"))).isTrue();
        assertThat(isNullableBoolean(preferenceSchema.at("/properties/marketing_push_enabled"))).isTrue();
    }

    private static void assertRequestRef(JsonNode root, String path, String method, String expectedRef) {
        String pointer = "/paths/" + encodePointer(path) + "/" + method + "/requestBody/content/application~1json/schema/$ref";
        assertThat(root.at(pointer).asText()).isEqualTo(expectedRef);
    }

    private static String encodePointer(String value) {
        return value.replace("~", "~0").replace("/", "~1");
    }

    private static boolean isNullableBoolean(JsonNode schema) {
        if (!schema.isObject()) {
            return false;
        }
        if (schema.path("nullable").asBoolean(false) && "boolean".equals(schema.path("type").asText())) {
            return true;
        }
        if (schema.path("type").isArray()) {
            boolean seenBoolean = false;
            boolean seenNull = false;
            for (JsonNode typeNode : schema.path("type")) {
                if ("boolean".equals(typeNode.asText())) {
                    seenBoolean = true;
                }
                if ("null".equals(typeNode.asText())) {
                    seenNull = true;
                }
            }
            if (seenBoolean && seenNull) {
                return true;
            }
        }
        return containsBooleanAndNull(schema.path("anyOf")) || containsBooleanAndNull(schema.path("oneOf"));
    }

    private static boolean containsBooleanAndNull(JsonNode candidates) {
        if (!candidates.isArray()) {
            return false;
        }
        boolean seenBoolean = false;
        boolean seenNull = false;
        Iterator<JsonNode> iterator = candidates.elements();
        while (iterator.hasNext()) {
            JsonNode node = iterator.next();
            if ("boolean".equals(node.path("type").asText())) {
                seenBoolean = true;
            }
            if ("null".equals(node.path("type").asText())) {
                seenNull = true;
            }
        }
        return seenBoolean && seenNull;
    }
}
