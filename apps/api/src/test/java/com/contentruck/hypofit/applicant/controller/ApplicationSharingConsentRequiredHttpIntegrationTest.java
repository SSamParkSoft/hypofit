package com.contentruck.hypofit.applicant.controller;

import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = "hypofit.privacy.application-sharing-consent-required=true")
class ApplicationSharingConsentRequiredHttpIntegrationTest extends ApplicationSharingConsentHttpIntegrationTest {
}
