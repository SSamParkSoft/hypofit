package com.contentruck.hypofit;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ArchitectureBoundaryTest {

    @Test
    void packageByFeatureModulesDoNotFormCycles() {
        ApplicationModules.of(HypofitApplication.class).verify();
    }
}
