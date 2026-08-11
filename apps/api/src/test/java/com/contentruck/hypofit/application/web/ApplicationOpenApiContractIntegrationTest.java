package com.contentruck.hypofit.application.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.contentruck.hypofit.HypofitApplication;
import com.contentruck.hypofit.common.observability.RequestIdFilter;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import java.util.List;

@SpringBootTest(
        classes = HypofitApplication.class,
        properties = {
                "spring.profiles.active=test",
                "hypofit.database-url=postgresql://postgres:postgres@127.0.0.1:5432/hypofit",
                "hypofit.supabase-jwt-secret=test-secret-test-secret-test-secret-1234",
                "hypofit.jwt-audience=authenticated"
        }
)
class ApplicationOpenApiContractIntegrationTest {

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
    void applicationStatusUpdateSchemaMatchesFastApiContract() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        JsonNode requestReference = root.at(
                "/paths/~1api~1v1~1applications~1{application_id}~1status/patch/"
                        + "requestBody/content/application~1json/schema"
        );
        assertThat(requestReference.at("/$ref").asText())
                .isEqualTo("#/components/schemas/ApplicationStatusUpdateRequest");

        JsonNode requestSchema = root.at("/components/schemas/ApplicationStatusUpdateRequest");
        assertThat(requestSchema.at("/required"))
                .extracting(JsonNode::asText)
                .containsExactly("status");
        assertThat(requestSchema.at("/properties/status/enum"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("canceled", "rejected", "selected");

        JsonNode rejectionReason = requestSchema.at("/properties/rejection_reason");
        assertThat(rejectionReason.at("/type"))
                .extracting(JsonNode::asText)
                .containsExactly("null", "string");
        assertThat(rejectionReason.at("/minLength").asInt()).isEqualTo(2);
        assertThat(rejectionReason.at("/maxLength").asInt()).isEqualTo(500);
    }

    @Test
    void applicationDetailResponsePublishesAiSummaryContract() throws Exception {
        JsonNode root = objectMapper.readTree(
                mockMvc.perform(get("/v3/api-docs"))
                        .andReturn()
                        .getResponse()
                        .getContentAsString()
        );

        assertSchemaContainsRef(
                root.at("/paths/~1api~1v1~1applications~1{application_id}/get/responses/200/content/application~1json/schema"),
                "#/components/schemas/ApplicationResponse"
        );

        JsonNode applicationResponse = root.at("/components/schemas/ApplicationResponse/properties/ai_summary");
        assertThat(applicationResponse.isObject()).isTrue();

        JsonNode aiSummarySchema = root.at("/components/schemas/ApplicantAiSummaryRead");
        assertThat(aiSummarySchema.at("/properties/status/enum"))
                .extracting(JsonNode::asText)
                .containsExactlyInAnyOrder("pending", "processing", "ready", "failed");
        assertSchemaContainsRef(
                aiSummarySchema.at("/properties/content"),
                "#/components/schemas/ApplicantSummaryContent"
        );
        assertThat(aiSummarySchema.at("/properties/updated_at/format").asText()).isEqualTo("date-time");

        JsonNode contentSchema = root.at("/components/schemas/ApplicantSummaryContent/properties");
        assertThat(contentSchema.at("/relevant_experience/type").asText()).isEqualTo("array");
        assertThat(contentSchema.at("/questions_to_confirm/type").asText()).isEqualTo("array");
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
}
