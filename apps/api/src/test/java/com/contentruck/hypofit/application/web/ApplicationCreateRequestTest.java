package com.contentruck.hypofit.application.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class ApplicationCreateRequestTest {

    @Test
    void constructorDefaultsNullCollectionsToEmpty() {
        ApplicationCreateRequest request = new ApplicationCreateRequest(UUID.randomUUID(), null, null);

        assertThat(request.answers()).isEmpty();
        assertThat(request.availableTimes()).isEmpty();
    }
}
