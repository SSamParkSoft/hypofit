package com.contentruck.hypofit.interview.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.contentruck.hypofit.common.config.HypofitProperties;
import java.util.List;
import org.junit.jupiter.api.Test;

class ConfiguredInterviewAdminPolicyTest {

    @Test
    void matchesConfiguredEmailsWithoutCaseSensitivity() {
        HypofitProperties properties = new HypofitProperties();
        properties.setAdminEmails(List.of(" Admin@Example.com "));
        ConfiguredInterviewAdminPolicy policy = new ConfiguredInterviewAdminPolicy(properties);

        assertThat(policy.isAdminEmail("admin@example.com")).isTrue();
        assertThat(policy.isAdminEmail("member@example.com")).isFalse();
        assertThat(policy.isAdminEmail(null)).isFalse();
    }
}
