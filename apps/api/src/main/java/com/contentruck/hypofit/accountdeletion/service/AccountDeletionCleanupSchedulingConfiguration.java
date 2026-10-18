package com.contentruck.hypofit.accountdeletion.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "hypofit.account-deletion", name = "cleanup-retry-enabled", havingValue = "true")
@EnableScheduling
public class AccountDeletionCleanupSchedulingConfiguration {
}
