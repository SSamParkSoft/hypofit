package com.contentruck.hypofit.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class HypofitPropertiesAiReadinessTest {

    @Test
    void reportsCredentialPresenceWithoutExposingCredentialValue() {
        HypofitProperties properties = new HypofitProperties();
        properties.setAiSummaryProvider("gemini");
        properties.setGeminiApiKey("secret-key-value");

        Map<String, Object> readiness = properties.aiProviderReadiness();

        assertThat(readiness).containsEntry("provider", "gemini");
        assertThat(readiness).containsEntry("configured", true);
        assertThat(readiness).containsEntry("generation_enabled", false);
        assertThat(readiness).doesNotContainValue("secret-key-value");
    }
}
