package com.contentruck.hypofit.common.observability;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ClientReleaseMetadataTest {

    @Test
    void acceptsSafeReleaseMetadataValues() {
        assertThat(ClientReleaseMetadata.normalize("1.0.1+42")).isEqualTo("1.0.1+42");
        assertThat(ClientReleaseMetadata.normalize("abc123_def")).isEqualTo("abc123_def");
    }

    @Test
    void rejectsUnsafeOrOversizedReleaseMetadataValues() {
        assertThat(ClientReleaseMetadata.normalize("1.0.1\nspoofed")).isNull();
        assertThat(ClientReleaseMetadata.normalize("x".repeat(65))).isNull();
    }
}
